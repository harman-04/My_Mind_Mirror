package com.mymindmirror.backend.service;

import com.mymindmirror.backend.payload.response.Anomaly;
import com.mymindmirror.backend.payload.response.DailyAggregatedDataResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
public class AnomalyDetectionService {

    private static final int EWMA_SPAN = 7;
    private static final double ALPHA = 2.0 / (EWMA_SPAN + 1.0); // 0.25
    private static final int MIN_DAYS_FOR_ANOMALY = 5; // Require at least 5 days of data

    private static final double MOOD_THRESHOLD_STD = 0.6;
    private static final double WORDS_THRESHOLD_STD = 0.8;

    public Map<String, Object> detectAnomalies(List<DailyAggregatedDataResponse> dailyData) {
        if (dailyData == null || dailyData.isEmpty()) {
            return Map.of("anomalies", List.of(), "message", "No data provided for anomaly detection.");
        }

        // Sort by date ascending
        dailyData.sort(Comparator.comparing(DailyAggregatedDataResponse::getDate));

        // Not enough data for reliable detection
        if (dailyData.size() < MIN_DAYS_FOR_ANOMALY) {
            String msg = String.format("Insufficient data (%d days). Need at least %d days for anomaly detection.",
                    dailyData.size(), MIN_DAYS_FOR_ANOMALY);
            return Map.of("anomalies", List.of(), "message", msg);
        }

        // Initialise EWMA with first day's values
        DailyAggregatedDataResponse first = dailyData.get(0);
        double moodEma = first.getAverageMood() != null ? first.getAverageMood() : 0.0;
        double moodVar = 0.0;
        double wordsEma = first.getTotalWords() != null ? first.getTotalWords() : 0.0;
        double wordsVar = 0.0;

        List<Anomaly> anomalies = new ArrayList<>();

        // Start checking after we have at least EWMA_SPAN days of data
        int warmupDays = Math.min(EWMA_SPAN, dailyData.size());
        // For the first warmupDays-1 days we only update EWMA, no anomaly check
        for (int i = 0; i < dailyData.size(); i++) {
            DailyAggregatedDataResponse currentDay = dailyData.get(i);
            Double currentMood = currentDay.getAverageMood();
            Long currentWords = currentDay.getTotalWords();

            // Skip if AI hasn't finished scoring
            if (currentMood == null || currentWords == null) continue;

            // Update mood EWMA and variance
            double moodDiff = currentMood - moodEma;
            moodEma = moodEma + ALPHA * moodDiff;
            moodVar = (1 - ALPHA) * (moodVar + ALPHA * moodDiff * moodDiff);
            double moodStd = Math.sqrt(moodVar);

            // Update words EWMA and variance
            double wordsDiff = currentWords - wordsEma;
            wordsEma = wordsEma + ALPHA * wordsDiff;
            wordsVar = (1 - ALPHA) * (wordsVar + ALPHA * wordsDiff * wordsDiff);
            double wordsStd = Math.sqrt(wordsVar);

            // Only check anomalies after warmup (i >= warmupDays - 1)
            if (i >= warmupDays - 1) {
                boolean isMoodAnomaly = false;
                String moodMsg = null;

                if (moodStd > 0) {
                    double zScoreMood = (currentMood - moodEma) / moodStd;
                    if (Math.abs(zScoreMood) > MOOD_THRESHOLD_STD) {
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
                    if (Math.abs(zScoreWords) > WORDS_THRESHOLD_STD) {
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
                    anomalies.add(new Anomaly(currentDay.getDate().toString(), types, fullMsg.toString().trim()));
                    log.info("Anomaly detected for {}: {}", currentDay.getDate(), fullMsg);
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