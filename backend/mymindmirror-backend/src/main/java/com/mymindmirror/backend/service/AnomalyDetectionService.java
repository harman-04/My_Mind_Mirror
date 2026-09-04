package com.mymindmirror.backend.service;

import com.mymindmirror.backend.payload.response.Anomaly;
import com.mymindmirror.backend.payload.response.DailyAggregatedDataResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
public class AnomalyDetectionService {

    @Value("${app.anomaly.ewma-span:7}")
    private int ewmaSpan;

    @Value("${app.anomaly.mood-threshold-std:0.6}")
    private double moodThresholdStd;

    @Value("${app.anomaly.words-threshold-std:0.8}")
    private double wordsThresholdStd;

    @Value("${app.anomaly.min-days:5}")
    private int minDaysForAnomaly;

    public Map<String, Object> detectAnomalies(List<DailyAggregatedDataResponse> dailyData) {
        if (dailyData == null || dailyData.isEmpty()) {
            return Map.of("anomalies", List.of(), "message", "No data provided for anomaly detection.");
        }

        dailyData.sort(Comparator.comparing(DailyAggregatedDataResponse::date));

        if (dailyData.size() < minDaysForAnomaly) {
            String msg = String.format("Insufficient data (%d days). Need at least %d days for anomaly detection.",
                    dailyData.size(), minDaysForAnomaly);
            return Map.of("anomalies", List.of(), "message", msg);
        }

        // ✅ Calculate alpha dynamically (no static constant)
        double alpha = 2.0 / (ewmaSpan + 1.0);

        DailyAggregatedDataResponse first = dailyData.get(0);
        double moodEma = first.averageMood() != null ? first.averageMood() : 0.0;
        double moodVar = 0.0;
        double wordsEma = first.totalWords() != null ? first.totalWords() : 0.0;
        double wordsVar = 0.0;

        List<Anomaly> anomalies = new ArrayList<>();
        int warmupDays = Math.min(ewmaSpan, dailyData.size());

        for (int i = 0; i < dailyData.size(); i++) {
            DailyAggregatedDataResponse currentDay = dailyData.get(i);
            Double currentMood = currentDay.averageMood();
            Long currentWords = currentDay.totalWords();

            if (currentMood == null || currentWords == null) continue;

            double moodDiff = currentMood - moodEma;
            moodEma = moodEma + alpha * moodDiff;
            moodVar = (1 - alpha) * (moodVar + alpha * moodDiff * moodDiff);
            double moodStd = Math.sqrt(moodVar);

            double wordsDiff = currentWords - wordsEma;
            wordsEma = wordsEma + alpha * wordsDiff;
            wordsVar = (1 - alpha) * (wordsVar + alpha * wordsDiff * wordsDiff);
            double wordsStd = Math.sqrt(wordsVar);

            if (i >= warmupDays - 1) {
                boolean isMoodAnomaly = false;
                String moodMsg = null;
                if (moodStd > 0) {
                    double zScoreMood = (currentMood - moodEma) / moodStd;
                    if (Math.abs(zScoreMood) > moodThresholdStd) {
                        isMoodAnomaly = true;
                        String dir = zScoreMood < 0 ? "lower" : "higher";
                        moodMsg = String.format("Your average mood (%.2f) was significantly %s than your recent typical mood (%.2f).",
                                currentMood, dir, moodEma);
                    }
                } else if (Math.abs(currentMood - moodEma) > 1e-6) {
                    isMoodAnomaly = true;
                    String dir = currentMood < moodEma ? "lower" : "higher";
                    moodMsg = String.format("Your average mood (%.2f) was significantly %s than your recent constant mood (%.2f).",
                            currentMood, dir, moodEma);
                }

                boolean isWordsAnomaly = false;
                String wordsMsg = null;
                if (wordsStd > 0) {
                    double zScoreWords = (currentWords - wordsEma) / wordsStd;
                    if (Math.abs(zScoreWords) > wordsThresholdStd) {
                        isWordsAnomaly = true;
                        String dir = zScoreWords < 0 ? "less" : "more";
                        wordsMsg = String.format("You wrote %d words, which is %s than your recent typical word count (%.0f).",
                                currentWords, dir, wordsEma);
                    }
                } else if (Math.abs(currentWords - wordsEma) > 1e-6) {
                    isWordsAnomaly = true;
                    String dir = currentWords < wordsEma ? "less" : "more";
                    wordsMsg = String.format("You wrote %d words, which is %s than your recent constant word count (%.0f).",
                            currentWords, dir, wordsEma);
                }

                if (isMoodAnomaly || isWordsAnomaly) {
                    List<String> types = new ArrayList<>();
                    StringBuilder fullMsg = new StringBuilder();
                    if (isMoodAnomaly) {
                        types.add("mood");
                        fullMsg.append(moodMsg).append(" ");
                    }
                    if (isWordsAnomaly) {
                        types.add("words");
                        fullMsg.append(wordsMsg).append(" ");
                    }
                    anomalies.add(new Anomaly(currentDay.date().toString(), types, fullMsg.toString().trim()));
                }
            }
        }

        if (anomalies.isEmpty()) {
            return Map.of("anomalies", List.of(), "message", "No significant anomalies detected in your recent journaling patterns.");
        } else {
            return Map.of("anomalies", anomalies, "message", "Detected " + anomalies.size() + " unusual journaling patterns.");
        }
    }
}