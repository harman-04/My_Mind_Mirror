package com.mymindmirror.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.ClusterResult;
import com.mymindmirror.backend.payload.DailyAggregatedDataResponse;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import com.mymindmirror.backend.util.EncryptionUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
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

    private ObjectMapper realObjectMapper = new ObjectMapper(); // real instance


    private ObjectMapper objectMapper = new ObjectMapper();

    private User testUser;
    private JournalEntry testEntry;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(journalService, "objectMapper", realObjectMapper);

        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setUsername("testuser");
        testUser.setPasswordHash("$2a$10$somehash");
        testUser.setEmail("test@example.com");

        testEntry = new JournalEntry();
        testEntry.setId(UUID.randomUUID());
        testEntry.setUser(testUser);
        testEntry.setEntryDate(LocalDate.now());
        testEntry.setCreationTimestamp(LocalDateTime.now()); // ⭐ ADDED: required for sorting
        testEntry.setRawText(EncryptionUtil.encrypt("Test content", testUser.getPasswordHash()));
        testEntry.setMoodScore(0.5);
    }

    // ------------------- saveJournalEntry -------------------
    @Test
    void saveJournalEntry_Success_ShouldEncryptAndCallAI() {
        String rawText = "Feeling great today!";
        // Mock save to return the entry with a generated ID
        when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> {
            JournalEntry entry = inv.getArgument(0);
            entry.setId(UUID.randomUUID()); // simulate DB generation
            return entry;
        });
        // Use any() for nullable apiKey (can be null)
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
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getUser()).isEqualTo(testUser);
        assertThat(saved.getEntryDate()).isEqualTo(LocalDate.now());
        assertThat(saved.getRawText()).isNotEqualTo(rawText); // encrypted
        assertThat(saved.getMoodScore()).isEqualTo(0.8);
        assertThat(saved.getKeyPhrases()).hasSize(1);
        verify(journalEntryRepository).save(any(JournalEntry.class));
        verify(mlServiceClient).analyzeJournal(eq(rawText), any());
    }

    @Test
    void saveJournalEntry_EmptyText_ShouldSkipAI() {
        String rawText = "";
        when(journalEntryRepository.save(any(JournalEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        JournalEntry saved = journalService.saveJournalEntry(testUser, rawText);

        assertThat(saved.getMoodScore()).isNull();
        assertThat(saved.getEmotions()).isNull();
        assertThat(saved.getKeyPhrases()).isEmpty();
        verify(mlServiceClient, never()).analyzeJournal(any(), any());
    }

    @Test
    void saveJournalEntry_NullUserSecret_ShouldThrowException() {
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

        assertThat(updated).isNotNull();
        assertThat(updated.getRawText()).isNotEqualTo(newText); // encrypted
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

        assertThat(updated).isNotNull();
        verify(mlServiceClient, never()).analyzeJournal(any(), any());
    }

    @Test
    void updateJournalEntry_EntryNotFound_ShouldThrow() {
        UUID entryId = UUID.randomUUID();
        when(journalEntryRepository.findById(entryId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> journalService.updateJournalEntry(entryId, testUser, "text"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void updateJournalEntry_UnauthorizedUser_ShouldThrow() {
        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());
        when(journalEntryRepository.findById(testEntry.getId())).thenReturn(Optional.of(testEntry));

        assertThatThrownBy(() -> journalService.updateJournalEntry(testEntry.getId(), otherUser, "text"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ------------------- deleteJournalEntry -------------------
    @Test
    void deleteJournalEntry_Success() {
        when(journalEntryRepository.findById(testEntry.getId())).thenReturn(Optional.of(testEntry));
        journalService.deleteJournalEntry(testEntry.getId(), testUser);
        verify(journalEntryRepository).delete(testEntry);
    }

    @Test
    void deleteJournalEntry_NotFound_ShouldThrow() {
        UUID id = UUID.randomUUID();
        when(journalEntryRepository.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> journalService.deleteJournalEntry(id, testUser))
                .isInstanceOf(IllegalArgumentException.class);
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
        assertThat(result.get(0).getRawText()).isEqualTo("Test content"); // decrypted
    }

    // ------------------- searchJournalEntriesByKeyword -------------------
    @Test
    void searchJournalEntriesByKeyword_ShouldDecryptAndFilter() {
        String keyword = "great";
        when(journalEntryRepository.findByUserOrderByCreationTimestampDesc(testUser))
                .thenReturn(List.of(testEntry));
        List<JournalEntry> result = journalService.searchJournalEntriesByKeyword(testUser, keyword);
        assertThat(result).isEmpty();
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

    // ------------------- triggerJournalClustering -------------------
    @Test
    void triggerJournalClustering_Success() {
        List<String> texts = List.of("entry1", "entry2");
        // Create mutable list with entries having creationTimestamp
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
        assertThat(result.getClusterThemes()).containsKey("Theme 1");
        verify(journalEntryRepository, times(2)).save(any(JournalEntry.class));
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
}