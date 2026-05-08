package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.*;
import com.mymindmirror.backend.payload.response.RoadmapGenerateResponse;
import com.mymindmirror.backend.payload.response.RoadmapResponse;
import com.mymindmirror.backend.repository.RoadmapRepository;
import com.mymindmirror.backend.repository.RoadmapTaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoadmapServiceTest {

    @Mock
    private WebClient mlServiceWebClient;

    @Mock
    private RoadmapRepository roadmapRepository;

    @Mock
    private ApiKeyService apiKeyService;

    @Mock
    private UserService userService;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private MilestoneService milestoneService;

    @Mock
    private TaskService taskService;

    @Mock
    private RoadmapTaskRepository taskRepository;

    @Mock
    private GamificationService gamificationService;

    @InjectMocks
    private RoadmapService roadmapService;

    private User testUser;
    private UUID userId;
    private String goal;
    private Integer timeframeWeeks;

    private WebClient.RequestBodyUriSpec requestBodyUriSpec;
    private WebClient.RequestHeadersSpec requestHeadersSpec;
    private WebClient.ResponseSpec responseSpec;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        testUser = new User();
        testUser.setId(userId);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("hashed");

        goal = "Learn Java";
        timeframeWeeks = 4;

        requestBodyUriSpec = mock(WebClient.RequestBodyUriSpec.class);
        requestHeadersSpec = mock(WebClient.RequestHeadersSpec.class);
        responseSpec = mock(WebClient.ResponseSpec.class);
    }

    private void mockWebClientPost(Object responseBody) {
        when(mlServiceWebClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.header(anyString(), anyString())).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        if (responseBody == null) {
            when(responseSpec.bodyToMono(any(Class.class))).thenReturn(Mono.empty());
        } else {
            when(responseSpec.bodyToMono(any(Class.class))).thenReturn(Mono.just(responseBody));
        }
    }

    @Test
    void generateRoadmap_Success() {
        RoadmapGenerateResponse aiResponse = new RoadmapGenerateResponse();
        aiResponse.setTitle("Java Learning Roadmap");
        aiResponse.setDurationWeeks(4);
        RoadmapGenerateResponse.Task task1 = new RoadmapGenerateResponse.Task();
        task1.setDay(1);
        task1.setWeek(1);
        task1.setDescription("Install JDK");
        task1.setType("daily");
        task1.setDetails("Download from oracle.com");
        task1.setSubtasks(List.of("Download", "Install"));
        aiResponse.setTasks(List.of(task1));

        RoadmapGenerateResponse.Resource res1 = new RoadmapGenerateResponse.Resource();
        res1.setName("Java Tutorial");
        res1.setUrl("https://java.com");
        res1.setType("article");
        aiResponse.setResources(List.of(res1));

        RoadmapGenerateResponse.Milestone mil1 = new RoadmapGenerateResponse.Milestone();
        mil1.setName("Setup done");
        mil1.setWeek(1);
        aiResponse.setMilestones(List.of(mil1));

        mockWebClientPost(aiResponse);

        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn("test-key");
        when(roadmapRepository.save(any(Roadmap.class))).thenAnswer(inv -> inv.getArgument(0));

        Roadmap result = roadmapService.generateRoadmap(testUser, goal, timeframeWeeks);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Java Learning Roadmap");
        assertThat(result.getDurationWeeks()).isEqualTo(4);
        assertThat(result.getTasks()).hasSize(1);
        assertThat(result.getResources()).hasSize(1);
        assertThat(result.getMilestones()).hasSize(1);
        verify(roadmapRepository).save(any(Roadmap.class));
    }

    @Test
    void generateRoadmap_AiResponseNull_UsesFallback() {
        // Simulate ML service returning null (connection failure)
        mockWebClientPost(null);
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn("test-key");
        // Mock save to return the passed roadmap
        when(roadmapRepository.save(any(Roadmap.class))).thenAnswer(inv -> inv.getArgument(0));

        Roadmap result = roadmapService.generateRoadmap(testUser, goal, timeframeWeeks);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).contains("Your Personalized Roadmap to " + goal);
        assertThat(result.getTasks()).isNotEmpty();
        assertThat(result.getResources()).isNotEmpty();
        assertThat(result.getMilestones()).isNotEmpty();
    }

    @Test
    void deleteRoadmap_Success() {
        Roadmap roadmap = new Roadmap();
        roadmap.setId(UUID.randomUUID());
        roadmap.setUser(testUser);
        when(roadmapRepository.findById(roadmap.getId())).thenReturn(Optional.of(roadmap));
        doNothing().when(roadmapRepository).delete(roadmap);

        roadmapService.deleteRoadmap(roadmap.getId(), testUser);

        verify(roadmapRepository).delete(roadmap);
    }

    @Test
    void deleteRoadmap_NotFound_ThrowsException() {
        UUID id = UUID.randomUUID();
        when(roadmapRepository.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> roadmapService.deleteRoadmap(id, testUser))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Roadmap not found");
    }

    @Test
    void importTaskToMilestone_Success() {
        Roadmap roadmap = new Roadmap();
        roadmap.setId(UUID.randomUUID());
        roadmap.setUser(testUser);
        roadmap.setTitle("Test Roadmap");
        RoadmapTask task = new RoadmapTask();
        task.setId(UUID.randomUUID());
        task.setDescription("Learn Java");
        roadmap.setTasks(List.of(task));

        Milestone milestone = new Milestone();
        milestone.setId(UUID.randomUUID());

        when(roadmapRepository.findById(roadmap.getId())).thenReturn(Optional.of(roadmap));
        when(milestoneService.getOrCreateMilestoneByTitle(eq(testUser), anyString())).thenReturn(milestone);
        when(taskService.createTaskWithRoadmapLink(any(), eq(testUser), eq("Learn Java"), eq(null), eq(task.getId())))
                .thenReturn(new Task());

        roadmapService.importTaskToMilestone(roadmap.getId(), task.getId(), testUser);

        assertThat(task.getImportedToMilestone()).isTrue();
        verify(taskRepository).save(task);
        verify(taskService).createTaskWithRoadmapLink(milestone.getId(), testUser, "Learn Java", null, task.getId());
    }

    @Test
    void toggleTaskCompletion_CompleteTask_UpdatesGamificationAndRoadmap() {
        Roadmap roadmap = new Roadmap();
        roadmap.setUser(testUser);
        RoadmapTask task = new RoadmapTask();
        task.setId(UUID.randomUUID());
        task.setCompleted(false);
        task.setRoadmap(roadmap);
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(taskRepository.save(any())).thenReturn(task);
        when(gamificationService.updateStreakAndBadges(testUser, true)).thenReturn(null);
        roadmap.setTasks(List.of(task));

        roadmapService.toggleTaskCompletion(task.getId(), testUser);

        assertThat(task.isCompleted()).isTrue();
        verify(gamificationService).updateStreakAndBadges(testUser, true);
        verify(gamificationService).awardRoadmapCompletedBadge(testUser);
    }

    @Test
    void continueRoadmap_Success() throws JsonProcessingException {
        Roadmap roadmap = new Roadmap();
        roadmap.setId(UUID.randomUUID());
        roadmap.setUser(testUser);
        roadmap.setTitle("Java Learning Roadmap");
        roadmap.setDescription(goal);
        roadmap.setDurationWeeks(4);
        RoadmapTask existingTask = new RoadmapTask();
        existingTask.setCompleted(true);
        existingTask.setDescription("Installed JDK");
        roadmap.setTasks(new ArrayList<>(List.of(existingTask)));

        Map<String, Object> aiResponse = new HashMap<>();
        Map<String, Object> newTask = new HashMap<>();
        newTask.put("description", "Learn OOP");
        newTask.put("details", "Study classes and objects");
        newTask.put("week", 2);
        newTask.put("day", 1);
        newTask.put("type", "daily");
        newTask.put("subtasks", List.of("Read chapter", "Write example"));
        aiResponse.put("tasks", List.of(newTask));

        mockWebClientPost(aiResponse);

        when(roadmapRepository.findById(roadmap.getId())).thenReturn(Optional.of(roadmap));
        when(roadmapRepository.save(any(Roadmap.class))).thenReturn(roadmap);
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn("test-key");
        when(objectMapper.writeValueAsString(any())).thenReturn("[]");

        RoadmapResponse response = roadmapService.continueRoadmap(roadmap.getId(), testUser);

        assertThat(response.getTasks()).hasSize(2);
        verify(roadmapRepository).save(roadmap);
    }

    @Test
    void continueRoadmap_NoCompletedTasks_ThrowsException() {
        Roadmap roadmap = new Roadmap();
        roadmap.setId(UUID.randomUUID());
        roadmap.setUser(testUser);
        roadmap.setTasks(List.of());
        when(roadmapRepository.findById(roadmap.getId())).thenReturn(Optional.of(roadmap));

        assertThatThrownBy(() -> roadmapService.continueRoadmap(roadmap.getId(), testUser))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No completed tasks yet");
    }

    @Test
    void elaborateTask_Success() throws JsonProcessingException {
        Roadmap roadmap = new Roadmap();
        roadmap.setUser(testUser);
        roadmap.setDescription(goal);
        RoadmapTask task = new RoadmapTask();
        task.setId(UUID.randomUUID());
        task.setDescription("Learn Java");
        task.setRoadmap(roadmap);
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        Map<String, Object> aiResponse = new HashMap<>();
        aiResponse.put("details", "Step by step guide...");
        aiResponse.put("subtasks", List.of("Step1", "Step2"));
        mockWebClientPost(aiResponse);

        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn("test-key");
        when(taskRepository.save(any(RoadmapTask.class))).thenReturn(task);
        when(objectMapper.writeValueAsString(any())).thenReturn("[\"Step1\",\"Step2\"]");

        RoadmapTask result = roadmapService.elaborateTask(task.getId(), testUser, false);

        assertThat(result.getDetails()).isEqualTo("Step by step guide...");
        verify(taskRepository).save(task);
    }

    @Test
    void rescheduleRoadmap_Success() {
        Roadmap roadmap = new Roadmap();
        roadmap.setId(UUID.randomUUID());
        roadmap.setUser(testUser);
        roadmap.setDescription(goal);
        roadmap.setDurationWeeks(4);
        RoadmapTask task1 = new RoadmapTask();
        task1.setCompleted(false);
        task1.setDescription("Task A");
        RoadmapTask task2 = new RoadmapTask();
        task2.setCompleted(false);
        task2.setDescription("Task B");
        roadmap.setTasks(new ArrayList<>(List.of(task1, task2)));

        Map<String, Object> aiResponse = new HashMap<>();
        aiResponse.put("newDurationWeeks", 3);
        Map<String, Object> update = new HashMap<>();
        update.put("taskId", 0);
        update.put("newWeek", 2);
        aiResponse.put("tasks", List.of(update));

        mockWebClientPost(aiResponse);

        when(roadmapRepository.findById(roadmap.getId())).thenReturn(Optional.of(roadmap));
        when(roadmapRepository.save(any(Roadmap.class))).thenReturn(roadmap);
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn("test-key");

        RoadmapResponse response = roadmapService.rescheduleRoadmap(roadmap.getId(), testUser);

        assertThat(response.getDurationWeeks()).isEqualTo(3);
        assertThat(task1.getWeekNumber()).isEqualTo(2);
        verify(roadmapRepository).save(roadmap);
    }
}