package com.mymindmirror.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.ClusterResult;
import com.mymindmirror.backend.payload.response.DailyAggregatedDataResponse;
import com.mymindmirror.backend.payload.response.MoodDataResponse;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import com.mymindmirror.backend.util.EncryptionUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JournalServiceTest {

    @Mock
    private JournalEntryRepository journalEntryRepository;

    @Mock
    private UserService userService;

    @Mock
    private ApiKeyService apiKeyService;

    @Mock
    private MLServiceClient mlServiceClient;

    @InjectMocks
    private JournalService journalService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User testUser;
    private JournalEntry testEntry;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(journalService, "objectMapper", objectMapper);

        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setUsername("testuser");
        testUser.setPasswordHash("$2a$10$somehash");
        testUser.setEmail("test@example.com");

        testEntry = new JournalEntry();
        testEntry.setId(UUID.randomUUID());
        testEntry.setUser(testUser);
        testEntry.setEntryDate(LocalDate.now());
        testEntry.setCreationTimestamp(LocalDateTime.now());
        testEntry.setRawText(EncryptionUtil.encrypt("Test content", testUser.getPasswordHash()));
        testEntry.setMoodScore(0.5);
    }

    // ------------------- saveJournalEntry -------------------
    @Test
    void saveJournalEntry_Success_ShouldEncryptAndCallAI() {
        String rawText = "Feeling great today!";
        when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> {
            JournalEntry entry = inv.getArgument(0);
            if (entry.getId() == null) {
                entry.setId(UUID.randomUUID());
            }
            return entry;
        });
        when(mlServiceClient.analyzeJournal(anyString(), any()))
                .thenReturn(Mono.just(Map.of(
                        "moodScore", 0.8,
                        "emotions", Map.of("joy", 0.9),
                        "coreConcerns", List.of("productivity"),
                        "summary", "Good day",
                        "growthTips", List.of("Keep going"),
                        "keyPhrases", List.of("great")
                )));

        JournalEntry saved = journalService.saveJournalEntry(testUser, rawText);

        assertThat(saved).isNotNull();
        assertThat(saved.getId()).isNotNull(); // now passes
        assertThat(saved.getRawText()).isNotEqualTo(rawText);
        assertThat(saved.getMoodScore()).isEqualTo(0.8);
        verify(journalEntryRepository).save(any(JournalEntry.class));
    }
    @Test
    void saveJournalEntry_EmptyText_ShouldSkipAI() {
        String rawText = "";
        when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        JournalEntry saved = journalService.saveJournalEntry(testUser, rawText);

        assertThat(saved.getMoodScore()).isNull();
        assertThat(saved.getKeyPhrases()).isEmpty();
        verify(mlServiceClient, never()).analyzeJournal(any(), any());
    }

    @Test
    void saveJournalEntry_NullUserSecret_ShouldThrow() {
        testUser.setPasswordHash(null);
        assertThatThrownBy(() -> journalService.saveJournalEntry(testUser, "text"))
                .isInstanceOf(IllegalStateException.class);
    }

    // ------------------- updateJournalEntry -------------------
    @Test
    void updateJournalEntry_ContentChanged_ShouldReRunAI() {
        UUID entryId = testEntry.getId();
        String newText = "Updated content";
        when(journalEntryRepository.findById(entryId)).thenReturn(Optional.of(testEntry));
        when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mlServiceClient.analyzeJournal(anyString(), any()))
                .thenReturn(Mono.just(Map.of(
                        "moodScore", 0.2,
                        "emotions", Map.of("sadness", 0.7),
                        "coreConcerns", List.of("anxiety"),
                        "summary", "Not great",
                        "growthTips", List.of("Take a break"),
                        "keyPhrases", List.of("worried")
                )));

        JournalEntry updated = journalService.updateJournalEntry(entryId, testUser, newText);

        assertThat(updated.getMoodScore()).isEqualTo(0.2);
        verify(mlServiceClient).analyzeJournal(eq(newText), any());
    }

    @Test
    void updateJournalEntry_ContentNotChanged_ShouldSkipAI() {
        UUID entryId = testEntry.getId();
        String sameText = "Test content";
        when(journalEntryRepository.findById(entryId)).thenReturn(Optional.of(testEntry));
        when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        JournalEntry updated = journalService.updateJournalEntry(entryId, testUser, sameText);

        assertThat(updated.getRawText()).isEqualTo(testEntry.getRawText());
        verify(mlServiceClient, never()).analyzeJournal(any(), any());
    }

    @Test
    void updateJournalEntry_EntryNotFound_ShouldThrow() {
        UUID entryId = UUID.randomUUID();
        when(journalEntryRepository.findById(entryId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> journalService.updateJournalEntry(entryId, testUser, "text"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ------------------- deleteJournalEntry -------------------
    @Test
    void deleteJournalEntry_Success() {
        when(journalEntryRepository.findById(testEntry.getId())).thenReturn(Optional.of(testEntry));
        journalService.deleteJournalEntry(testEntry.getId(), testUser);
        verify(journalEntryRepository).delete(testEntry);
    }

    // ------------------- getJournalEntriesForUser -------------------
    @Test
    void getJournalEntriesForUser_ShouldDecrypt() {
        LocalDate start = LocalDate.now().minusDays(7);
        LocalDate end = LocalDate.now();
        List<JournalEntry> entries = List.of(testEntry);
        when(journalEntryRepository.findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(testUser, start, end))
                .thenReturn(entries);

        List<JournalEntry> result = journalService.getJournalEntriesForUser(testUser, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRawText()).isEqualTo("Test content");
    }

    // ------------------- getJournalEntriesPage -------------------
    @Test
    void getJournalEntriesPage_ShouldReturnDecryptedPage() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<JournalEntry> page = new PageImpl<>(List.of(testEntry));
        LocalDate start = LocalDate.of(1900, 1, 1);
        LocalDate end = LocalDate.of(2100, 12, 31);
        when(journalEntryRepository.findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(eq(testUser), eq(start), eq(end), eq(pageable)))
                .thenReturn(page);

        Page<JournalEntry> result = journalService.getJournalEntriesPage(testUser, start, end, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRawText()).isEqualTo("Test content");
    }

    // ------------------- getMoodDataForChart -------------------
    @Test
    void getMoodDataForChart_ShouldReturnMoodData() {
        LocalDate start = LocalDate.now().minusDays(7);
        LocalDate end = LocalDate.now();
        List<JournalEntry> entries = List.of(testEntry);
        when(journalEntryRepository.findByUserAndEntryDateBetween(testUser, start, end))
                .thenReturn(entries);

        List<MoodDataResponse> result = journalService.getMoodDataForChart(testUser, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDate()).isEqualTo(testEntry.getEntryDate());
        assertThat(result.get(0).getMoodScore()).isEqualTo(0.5);
    }

    @Test
    void getMoodDataForChart_NoMoodScore_ShouldFilterOut() {
        testEntry.setMoodScore(null);
        LocalDate start = LocalDate.now().minusDays(7);
        LocalDate end = LocalDate.now();
        when(journalEntryRepository.findByUserAndEntryDateBetween(testUser, start, end))
                .thenReturn(List.of(testEntry));

        List<MoodDataResponse> result = journalService.getMoodDataForChart(testUser, start, end);

        assertThat(result).isEmpty();
    }

    // ------------------- searchJournalEntriesByMoodScore -------------------
    @Test
    void searchJournalEntriesByMoodScore_ShouldReturnMatching() {
        Double min = 0.3;
        Double max = 0.7;
        List<JournalEntry> entries = List.of(testEntry);
        when(journalEntryRepository.findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(testUser, min, max))
                .thenReturn(entries);

        List<JournalEntry> result = journalService.searchJournalEntriesByMoodScore(testUser, min, max);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRawText()).isEqualTo("Test content");
    }

    @Test
    void searchJournalEntriesByMoodScore_NoMatches_ShouldReturnEmpty() {
        Double min = 0.8;
        Double max = 1.0;
        when(journalEntryRepository.findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(testUser, min, max))
                .thenReturn(List.of());

        List<JournalEntry> result = journalService.searchJournalEntriesByMoodScore(testUser, min, max);

        assertThat(result).isEmpty();
    }

    // ------------------- findByUser -------------------
    @Test
    void findByUser_ShouldDecryptAllEntries() {
        List<JournalEntry> entries = List.of(testEntry);
        when(journalEntryRepository.findByUser(testUser)).thenReturn(entries);

        List<JournalEntry> result = journalService.findByUser(testUser);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRawText()).isEqualTo("Test content");
    }

    // ------------------- getDailyAggregatedDataForUser -------------------
    @Test
    void getDailyAggregatedDataForUser_ShouldReturnAggregatedData() {
        LocalDate start = LocalDate.now().minusDays(7);
        LocalDate end = LocalDate.now();
        Object[] row = new Object[]{LocalDate.now(), 0.5, 100L};
        List<Object[]> results = List.<Object[]>of(row);
        when(journalEntryRepository.findDailyAggregatedDataByUserAndDateRange(testUser.getId(), start, end))
                .thenReturn(results);

        List<DailyAggregatedDataResponse> result = journalService.getDailyAggregatedDataForUser(testUser, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDate()).isEqualTo(LocalDate.now());
        assertThat(result.get(0).getAverageMood()).isEqualTo(0.5);
        assertThat(result.get(0).getTotalWords()).isEqualTo(100L);
    }

    // ------------------- runAnomalyDetection -------------------
    @Test
    void runAnomalyDetection_ShouldCallMLClient() {
        List<DailyAggregatedDataResponse> data = List.of(
                new DailyAggregatedDataResponse(LocalDate.now(), 0.5, 100L)
        );
        Map<String, Object> mockResponse = Map.of("anomalies", List.of());
        when(mlServiceClient.runAnomalyDetection(anyList(), any()))
                .thenReturn(Mono.just(mockResponse));

        Map<String, Object> result = journalService.runAnomalyDetection(data);

        assertThat(result).isEqualTo(mockResponse);
    }

    @Test
    void runAnomalyDetection_Exception_ShouldReturnErrorMap() {
        List<DailyAggregatedDataResponse> data = List.of(
                new DailyAggregatedDataResponse(LocalDate.now(), 0.5, 100L)
        );
        when(mlServiceClient.runAnomalyDetection(anyList(), any()))
                .thenThrow(new RuntimeException("Network error"));

        Map<String, Object> result = journalService.runAnomalyDetection(data);

        assertThat(result).containsKey("error");
    }

    // ------------------- triggerJournalClustering -------------------
    @Test
    void triggerJournalClustering_Success() {
        List<String> texts = List.of("entry1", "entry2");
        List<JournalEntry> entries = new ArrayList<>();
        JournalEntry e1 = new JournalEntry();
        e1.setCreationTimestamp(LocalDateTime.now().minusDays(1));
        JournalEntry e2 = new JournalEntry();
        e2.setCreationTimestamp(LocalDateTime.now());
        entries.add(e1);
        entries.add(e2);

        when(journalEntryRepository.findByUser(testUser)).thenReturn(entries);
        when(mlServiceClient.clusterJournalEntries(anyMap(), any()))
                .thenReturn(Mono.just(new ClusterResult(2, Map.of("Theme 1", "Work", "Theme 2", "Health"), List.of(0, 1))));

        ClusterResult result = journalService.triggerJournalClustering(testUser, texts, 2);

        assertThat(result.getNumClusters()).isEqualTo(2);
        verify(journalEntryRepository, times(2)).save(any(JournalEntry.class));
    }

    @Test
    void triggerJournalClustering_EmptyEntries_ShouldReturnEmpty() {
        when(journalEntryRepository.findByUser(testUser)).thenReturn(new ArrayList<>()); // mutable empty list

        ClusterResult result = journalService.triggerJournalClustering(testUser, List.of("a"), 2);

        assertThat(result.getNumClusters()).isEqualTo(0);
        verify(journalEntryRepository, never()).save(any());
    }

    // ------------------- generateReflectionFromMlService -------------------
    @Test
    void generateReflectionFromMlService_Success() {
        String prompt = "Reflect on today";
        String reflection = "You had a good day";
        when(mlServiceClient.generateReflection(eq(prompt), any()))
                .thenReturn(Mono.just(Map.of("reflection", reflection)));

        String result = journalService.generateReflectionFromMlService(prompt, testUser);

        assertThat(result).isEqualTo(reflection);
    }

    @Test
    void generateReflectionFromMlService_Error_ReturnsFallback() {
        String prompt = "Reflect";
        when(mlServiceClient.generateReflection(eq(prompt), any()))
                .thenThrow(new RuntimeException("ML service down"));

        String result = journalService.generateReflectionFromMlService(prompt, testUser);

        assertThat(result).contains("Failed to generate reflection");
    }

    // ------------------- getAllEntriesForUser -------------------
    @Test
    void getAllEntriesForUser_ShouldDelegateToFindByUser() {
        List<JournalEntry> entries = List.of(testEntry);
        when(journalEntryRepository.findByUser(testUser)).thenReturn(entries);

        List<JournalEntry> result = journalService.getAllEntriesForUser(testUser);

        assertThat(result).hasSize(1);
    }
    // ==================== searchJournalEntriesByKeyword ====================
    @Test
    void searchJournalEntriesByKeyword_Success() {
        String keyword = "great";
        String encryptedText = EncryptionUtil.encrypt("Feeling great today", testUser.getPasswordHash());
        JournalEntry entry = new JournalEntry();
        entry.setRawText(encryptedText);
        entry.setUser(testUser);
        entry.setKeyPhrases(new ArrayList<>());

        List<JournalEntry> allEntries = List.of(entry);
        when(journalEntryRepository.findByUserOrderByCreationTimestampDesc(testUser)).thenReturn(allEntries);

        List<JournalEntry> result = journalService.searchJournalEntriesByKeyword(testUser, keyword);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRawText()).isEqualTo("Feeling great today");
    }

    @Test
    void searchJournalEntriesByKeyword_NoMatch_ShouldReturnEmpty() {
        String keyword = "nonexistent";
        String encryptedText = EncryptionUtil.encrypt("Feeling great", testUser.getPasswordHash());
        JournalEntry entry = new JournalEntry();
        entry.setRawText(encryptedText);
        entry.setUser(testUser);
        entry.setKeyPhrases(new ArrayList<>());

        List<JournalEntry> allEntries = List.of(entry);
        when(journalEntryRepository.findByUserOrderByCreationTimestampDesc(testUser)).thenReturn(allEntries);

        List<JournalEntry> result = journalService.searchJournalEntriesByKeyword(testUser, keyword);

        assertThat(result).isEmpty();
    }

    @Test
    void searchJournalEntriesByKeyword_UserSecretNull_ShouldReturnEmpty() {
        testUser.setPasswordHash(null);
        List<JournalEntry> result = journalService.searchJournalEntriesByKeyword(testUser, "anything");
        assertThat(result).isEmpty();
        verify(journalEntryRepository, never()).findByUserOrderByCreationTimestampDesc(any());
    }

    // ==================== processAiAnalysis (indirectly via saveJournalEntry) ====================
    @Test
    void saveJournalEntry_MLResponseNull_ShouldResetAiFields() {
        String rawText = "Some text";
        when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mlServiceClient.analyzeJournal(anyString(), any()))
                .thenReturn(Mono.empty()); // Simulate null response

        JournalEntry saved = journalService.saveJournalEntry(testUser, rawText);

        assertThat(saved.getMoodScore()).isNull();
        assertThat(saved.getEmotions()).isNull();
        assertThat(saved.getCoreConcerns()).isNull();
        assertThat(saved.getSummary()).isNull();
        assertThat(saved.getGrowthTips()).isNull();
        assertThat(saved.getKeyPhrases()).isEmpty();
    }

    @Test
    void saveJournalEntry_MLResponseInvalidMoodScore_ShouldSetNull() {
        String rawText = "Text";
        when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mlServiceClient.analyzeJournal(anyString(), any()))
                .thenReturn(Mono.just(Map.of("moodScore", "not a number")));

        JournalEntry saved = journalService.saveJournalEntry(testUser, rawText);

        assertThat(saved.getMoodScore()).isNull();
    }

    @Test
    void saveJournalEntry_MLResponseThrowsJsonProcessingException_ShouldResetAiFields() {
        String rawText = "Text";
        when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> inv.getArgument(0));
        // Simulate response that will cause JsonProcessingException when writing emotions
        Map<String, Object> response = new HashMap<>();
        response.put("emotions", new Object()); // not serializable to JSON
        response.put("coreConcerns", List.of());
        response.put("summary", "summary");
        response.put("growthTips", List.of());
        response.put("keyPhrases", List.of());
        response.put("moodScore", 0.5);
        when(mlServiceClient.analyzeJournal(anyString(), any()))
                .thenReturn(Mono.just(response));

        JournalEntry saved = journalService.saveJournalEntry(testUser, rawText);

        assertThat(saved.getMoodScore()).isNull();
        assertThat(saved.getEmotions()).isNull();
        assertThat(saved.getKeyPhrases()).isEmpty();
    }

    // ==================== getJournalEntryById ====================
    @Test
    void getJournalEntryById_UserNotFound_ShouldThrow() {
        UUID entryId = testEntry.getId();
        when(journalEntryRepository.findById(entryId)).thenReturn(Optional.of(testEntry));
        when(userService.findByUsername(testUser.getUsername())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> journalService.getJournalEntryById(entryId))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void getJournalEntryById_DecryptionFails_ShouldReturnOriginalCiphertext() {
        UUID entryId = testEntry.getId();
        // Simulate corrupted encrypted text
        testEntry.setRawText("invalid_base64");
        when(journalEntryRepository.findById(entryId)).thenReturn(Optional.of(testEntry));
        when(userService.findByUsername(testUser.getUsername())).thenReturn(Optional.of(testUser));

        Optional<JournalEntry> result = journalService.getJournalEntryById(entryId);

        assertThat(result).isPresent();
        assertThat(result.get().getRawText()).isEqualTo("invalid_base64");
    }

    // ==================== updateJournalEntry – additional branches ====================
    @Test
    void updateJournalEntry_EncryptionFails_ShouldThrow() {
        UUID entryId = testEntry.getId();
        String newText = "new text";
        testUser.setPasswordHash(null);
        when(journalEntryRepository.findById(entryId)).thenReturn(Optional.of(testEntry));

        assertThatThrownBy(() -> journalService.updateJournalEntry(entryId, testUser, newText))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void updateJournalEntry_TextEmptyAfterChange_ShouldSkipAIAndResetFields() {
        UUID entryId = testEntry.getId();
        String newText = "";
        // Need to simulate that the text changed from non-empty to empty
        // First, set current encrypted text to something
        testEntry.setRawText(EncryptionUtil.encrypt("old text", testUser.getPasswordHash()));
        when(journalEntryRepository.findById(entryId)).thenReturn(Optional.of(testEntry));
        when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        JournalEntry updated = journalService.updateJournalEntry(entryId, testUser, newText);

        assertThat(updated.getRawText()).isNotEqualTo("old text"); // encrypted differently
        assertThat(updated.getMoodScore()).isNull();
        assertThat(updated.getKeyPhrases()).isEmpty();
        verify(mlServiceClient, never()).analyzeJournal(any(), any());
    }

    // ==================== triggerJournalClustering – more branches ====================
    @Test
    void triggerJournalClustering_MismatchSize_ShouldLogErrorAndNotUpdate() {
        List<String> texts = List.of("entry1");
        List<JournalEntry> entries = new ArrayList<>();
        JournalEntry e1 = new JournalEntry();
        e1.setCreationTimestamp(LocalDateTime.now().minusDays(1));
        JournalEntry e2 = new JournalEntry();
        e2.setCreationTimestamp(LocalDateTime.now());
        entries.add(e1);
        entries.add(e2);
        when(journalEntryRepository.findByUser(testUser)).thenReturn(entries);
        when(mlServiceClient.clusterJournalEntries(anyMap(), any()))
                .thenReturn(Mono.just(new ClusterResult(1, Map.of("Theme 1", "Work"), List.of(0))));

        ClusterResult result = journalService.triggerJournalClustering(testUser, texts, 1);

        assertThat(result.getNumClusters()).isEqualTo(1);
        verify(journalEntryRepository, never()).save(any()); // no update because sizes differ
    }
    @Test
    void triggerJournalClustering_MLResultNull_ShouldReturnEmpty() {
        List<String> texts = List.of("entry1", "entry2");
        List<JournalEntry> entries = new ArrayList<>();
        JournalEntry e1 = new JournalEntry();
        e1.setCreationTimestamp(LocalDateTime.now().minusDays(1));
        JournalEntry e2 = new JournalEntry();
        e2.setCreationTimestamp(LocalDateTime.now());
        entries.add(e1);
        entries.add(e2);
        when(journalEntryRepository.findByUser(testUser)).thenReturn(entries);
        when(mlServiceClient.clusterJournalEntries(anyMap(), any()))
                .thenReturn(Mono.empty());

        ClusterResult result = journalService.triggerJournalClustering(testUser, texts, 2);

        assertThat(result.getNumClusters()).isEqualTo(0);
        assertThat(result.getEntryClusters()).isEmpty();
    }

    // ==================== getJournalEntriesPage – branch for null userSecret ====================
    @Test
    void getJournalEntriesPage_UserSecretNull_ShouldNotDecrypt() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<JournalEntry> page = new PageImpl<>(List.of(testEntry));
        LocalDate start = LocalDate.of(1900, 1, 1);
        LocalDate end = LocalDate.of(2100, 12, 31);
        testUser.setPasswordHash(null);
        when(journalEntryRepository.findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(eq(testUser), eq(start), eq(end), eq(pageable)))
                .thenReturn(page);

        Page<JournalEntry> result = journalService.getJournalEntriesPage(testUser, start, end, pageable);

        assertThat(result.getContent()).hasSize(1);
        // RawText remains encrypted because userSecret null
        assertThat(result.getContent().get(0).getRawText()).isNotEqualTo("Test content");
    }

    // ==================== getMoodDataForChart – branch for userSecret null ====================
    @Test
    void getMoodDataForChart_UserSecretNull_ShouldNotDecrypt() {
        LocalDate start = LocalDate.now().minusDays(7);
        LocalDate end = LocalDate.now();
        testUser.setPasswordHash(null);
        List<JournalEntry> entries = List.of(testEntry);
        when(journalEntryRepository.findByUserAndEntryDateBetween(testUser, start, end))
                .thenReturn(entries);

        List<MoodDataResponse> result = journalService.getMoodDataForChart(testUser, start, end);

        // Even without decryption, mood score is still available (it's stored as number)
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMoodScore()).isEqualTo(0.5);
    }

    // ==================== getJournalEntriesForUser – branch for userSecret null ====================
    @Test
    void getJournalEntriesForUser_UserSecretNull_ShouldNotDecrypt() {
        LocalDate start = LocalDate.now().minusDays(7);
        LocalDate end = LocalDate.now();
        testUser.setPasswordHash(null);
        List<JournalEntry> entries = List.of(testEntry);
        when(journalEntryRepository.findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(testUser, start, end))
                .thenReturn(entries);

        List<JournalEntry> result = journalService.getJournalEntriesForUser(testUser, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRawText()).isNotEqualTo("Test content");
    }

    // ==================== findByUser – branch for userSecret null ====================
    @Test
    void findByUser_UserSecretNull_ShouldNotDecrypt() {
        testUser.setPasswordHash(null);
        List<JournalEntry> entries = List.of(testEntry);
        when(journalEntryRepository.findByUser(testUser)).thenReturn(entries);

        List<JournalEntry> result = journalService.findByUser(testUser);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRawText()).isNotEqualTo("Test content");
    }

    // ==================== searchJournalEntriesByMoodScore – branch for userSecret null ====================
    @Test
    void searchJournalEntriesByMoodScore_UserSecretNull_ShouldNotDecrypt() {
        testUser.setPasswordHash(null);
        List<JournalEntry> entries = List.of(testEntry);
        when(journalEntryRepository.findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(testUser, 0.3, 0.7))
                .thenReturn(entries);

        List<JournalEntry> result = journalService.searchJournalEntriesByMoodScore(testUser, 0.3, 0.7);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRawText()).isNotEqualTo("Test content");
    }

    // ==================== deleteJournalEntry – branch for ownership check already covered, but add negative case ====================
    @Test
    void deleteJournalEntry_NotOwned_ShouldThrow() {
        UUID entryId = testEntry.getId();
        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());
        testEntry.setUser(otherUser);
        when(journalEntryRepository.findById(entryId)).thenReturn(Optional.of(testEntry));

        assertThatThrownBy(() -> journalService.deleteJournalEntry(entryId, testUser))
                .isInstanceOf(IllegalArgumentException.class);
    }
}