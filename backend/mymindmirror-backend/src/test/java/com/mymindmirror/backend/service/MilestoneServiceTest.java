package com.mymindmirror.backend.service;

import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.MilestoneRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MilestoneServiceTest {

    @Mock
    private MilestoneRepository milestoneRepository;

    @Mock
    private UserService userService; // Not used in current methods, but required for injection

    @InjectMocks
    private MilestoneService milestoneService;

    private User testUser;
    private Milestone testMilestone;
    private UUID milestoneId;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("hashed");

        milestoneId = UUID.randomUUID();
        testMilestone = new Milestone(testUser, "Test Milestone", "Description", LocalDate.now().plusDays(7));
        testMilestone.setId(milestoneId);
        testMilestone.setStatus(Status.PENDING);
    }

    // ========== createMilestone ==========
    @Test
    void createMilestone_ShouldSaveAndReturnMilestone() {
        when(milestoneRepository.save(any(Milestone.class))).thenReturn(testMilestone);

        Milestone result = milestoneService.createMilestone(testUser, "Test Milestone", "Description", LocalDate.now().plusDays(7));

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Test Milestone");
        assertThat(result.getStatus()).isEqualTo(Status.PENDING);
        verify(milestoneRepository, times(1)).save(any(Milestone.class));
    }

    // ========== getAllMilestonesForUser ==========
    @Test
    void getAllMilestonesForUser_ShouldReturnList() {
        List<Milestone> expected = List.of(testMilestone);
        when(milestoneRepository.findByUserOrderByCreationDateDesc(testUser)).thenReturn(expected);

        List<Milestone> result = milestoneService.getAllMilestonesForUser(testUser);

        assertThat(result).hasSize(1);
        assertThat(result.get(0)).isEqualTo(testMilestone);
    }

    // ========== getMilestoneByIdForUser ==========
    @Test
    void getMilestoneByIdForUser_WhenExists_ShouldReturnMilestone() {
        when(milestoneRepository.findByIdAndUser(milestoneId, testUser))
                .thenReturn(List.of(testMilestone));

        Optional<Milestone> result = milestoneService.getMilestoneByIdForUser(milestoneId, testUser);

        assertThat(result).isPresent();
        assertThat(result.get()).isEqualTo(testMilestone);
        // Verify that Hibernate.initialize was called (indirectly through the proxy, but we can't verify static method)
        // We rely on the fact that the method didn't throw an exception.
    }

    @Test
    void getMilestoneByIdForUser_WhenNotFound_ShouldReturnEmpty() {
        when(milestoneRepository.findByIdAndUser(milestoneId, testUser)).thenReturn(List.of());

        Optional<Milestone> result = milestoneService.getMilestoneByIdForUser(milestoneId, testUser);

        assertThat(result).isEmpty();
    }

    // ========== updateMilestone ==========
    @Test
    void updateMilestone_ShouldUpdateFieldsAndSave() {
        when(milestoneRepository.findByIdAndUser(milestoneId, testUser))
                .thenReturn(List.of(testMilestone));
        when(milestoneRepository.save(any(Milestone.class))).thenReturn(testMilestone);

        Milestone updated = milestoneService.updateMilestone(
                milestoneId, testUser,
                "New Title", "New Description",
                LocalDate.now().plusDays(14),
                Status.IN_PROGRESS
        );

        assertThat(updated.getTitle()).isEqualTo("New Title");
        assertThat(updated.getDescription()).isEqualTo("New Description");
        assertThat(updated.getDueDate()).isEqualTo(LocalDate.now().plusDays(14));
        assertThat(updated.getStatus()).isEqualTo(Status.IN_PROGRESS);
        verify(milestoneRepository).save(testMilestone);
    }

    @Test
    void updateMilestone_WhenMilestoneNotFound_ShouldThrowException() {
        when(milestoneRepository.findByIdAndUser(milestoneId, testUser)).thenReturn(List.of());

        assertThatThrownBy(() -> milestoneService.updateMilestone(
                milestoneId, testUser, "New Title", null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Milestone not found");
    }

    // ========== deleteMilestone ==========
    @Test
    void deleteMilestone_ShouldDelete() {
        when(milestoneRepository.findByIdAndUser(milestoneId, testUser))
                .thenReturn(List.of(testMilestone));

        milestoneService.deleteMilestone(milestoneId, testUser);

        verify(milestoneRepository).delete(testMilestone);
    }

    @Test
    void deleteMilestone_WhenNotFound_ShouldThrowException() {
        when(milestoneRepository.findByIdAndUser(milestoneId, testUser)).thenReturn(List.of());

        assertThatThrownBy(() -> milestoneService.deleteMilestone(milestoneId, testUser))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ========== updateMilestoneStatusBasedOnTasks ==========
    @Test
    void updateMilestoneStatusBasedOnTasks_AllTasksCompleted_ShouldSetCompleted() {
        Task task1 = new Task();
        task1.setStatus(Status.COMPLETED);
        Task task2 = new Task();
        task2.setStatus(Status.COMPLETED);
        testMilestone.setTasks(List.of(task1, task2));

        when(milestoneRepository.findById(milestoneId)).thenReturn(Optional.of(testMilestone));
        when(milestoneRepository.save(any(Milestone.class))).thenReturn(testMilestone);

        milestoneService.updateMilestoneStatusBasedOnTasks(milestoneId);

        assertThat(testMilestone.getStatus()).isEqualTo(Status.COMPLETED);
        verify(milestoneRepository).save(testMilestone);
    }

    @Test
    void updateMilestoneStatusBasedOnTasks_SomeTasksCompleted_ShouldSetInProgress() {
        Task task1 = new Task();
        task1.setStatus(Status.COMPLETED);
        Task task2 = new Task();
        task2.setStatus(Status.PENDING);
        testMilestone.setTasks(List.of(task1, task2));

        when(milestoneRepository.findById(milestoneId)).thenReturn(Optional.of(testMilestone));
        when(milestoneRepository.save(any(Milestone.class))).thenReturn(testMilestone);

        milestoneService.updateMilestoneStatusBasedOnTasks(milestoneId);

        assertThat(testMilestone.getStatus()).isEqualTo(Status.IN_PROGRESS);
    }

    @Test
    void updateMilestoneStatusBasedOnTasks_NoTasks_ShouldStayPending() {
        testMilestone.setTasks(List.of());

        when(milestoneRepository.findById(milestoneId)).thenReturn(Optional.of(testMilestone));
        when(milestoneRepository.save(any(Milestone.class))).thenReturn(testMilestone);

        milestoneService.updateMilestoneStatusBasedOnTasks(milestoneId);

        assertThat(testMilestone.getStatus()).isEqualTo(Status.PENDING);
    }

    @Test
    void updateMilestoneStatusBasedOnTasks_OverdueNotCompleted_ShouldSetOverdue() {
        testMilestone.setDueDate(LocalDate.now().minusDays(1));
        testMilestone.setStatus(Status.PENDING);
        Task task = new Task();
        task.setStatus(Status.PENDING);
        testMilestone.setTasks(List.of(task));

        when(milestoneRepository.findById(milestoneId)).thenReturn(Optional.of(testMilestone));
        when(milestoneRepository.save(any(Milestone.class))).thenReturn(testMilestone);

        milestoneService.updateMilestoneStatusBasedOnTasks(milestoneId);

        assertThat(testMilestone.getStatus()).isEqualTo(Status.OVERDUE);
    }

    // ========== getOrCreateMilestoneByTitle ==========
    @Test
    void getOrCreateMilestoneByTitle_WhenExists_ShouldReturnExisting() {
        when(milestoneRepository.findByUserOrderByCreationDateDesc(testUser))
                .thenReturn(List.of(testMilestone));

        Milestone result = milestoneService.getOrCreateMilestoneByTitle(testUser, "Test Milestone");

        assertThat(result).isEqualTo(testMilestone);
        verify(milestoneRepository, never()).save(any());
    }

    @Test
    void getOrCreateMilestoneByTitle_WhenNotExists_ShouldCreateNew() {
        when(milestoneRepository.findByUserOrderByCreationDateDesc(testUser)).thenReturn(List.of());
        when(milestoneRepository.save(any(Milestone.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Milestone result = milestoneService.getOrCreateMilestoneByTitle(testUser, "New Milestone");

        assertThat(result.getTitle()).isEqualTo("New Milestone");
        assertThat(result.getDescription()).isEqualTo("Auto-generated from roadmap");
        verify(milestoneRepository, times(1)).save(any(Milestone.class));
    }
}