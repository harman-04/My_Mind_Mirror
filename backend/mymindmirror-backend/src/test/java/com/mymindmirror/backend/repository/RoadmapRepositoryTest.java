package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.Roadmap;
import com.mymindmirror.backend.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class RoadmapRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private RoadmapRepository roadmapRepository;

    private User user1;
    private User user2;
    private Roadmap roadmap1, roadmap2, roadmap3;

    @BeforeEach
    void setUp() {
        // Create users
        user1 = new User();
        user1.setUsername("roadmapUser1");
        user1.setEmail("user1@example.com");
        user1.setPasswordHash("hashed1");
        entityManager.persist(user1);

        user2 = new User();
        user2.setUsername("roadmapUser2");
        user2.setEmail("user2@example.com");
        user2.setPasswordHash("hashed2");
        entityManager.persist(user2);

        // Create roadmaps for user1 with different creation dates
        roadmap1 = new Roadmap(user1, "Title 1", "Desc 1", 4);
        roadmap1.setCreatedAt(LocalDate.of(2025, 4, 1));
        entityManager.persist(roadmap1);

        roadmap2 = new Roadmap(user1, "Title 2", "Desc 2", 6);
        roadmap2.setCreatedAt(LocalDate.of(2025, 4, 5));
        entityManager.persist(roadmap2);

        roadmap3 = new Roadmap(user1, "Title 3", "Desc 3", 8);
        roadmap3.setCreatedAt(LocalDate.of(2025, 4, 3));
        entityManager.persist(roadmap3);

        // Create a roadmap for user2 (should not appear in user1's queries)
        Roadmap user2Roadmap = new Roadmap(user2, "User2 Roadmap", "For user2", 2);
        user2Roadmap.setCreatedAt(LocalDate.of(2025, 4, 2));
        entityManager.persist(user2Roadmap);

        entityManager.flush();
    }

    @Test
    void findByUserOrderByCreatedAtDesc_ShouldReturnRoadmapsInDescendingOrder() {
        List<Roadmap> roadmaps = roadmapRepository.findByUserOrderByCreatedAtDesc(user1);

        assertThat(roadmaps).hasSize(3);
        // Order should be: roadmap2 (Apr 5), roadmap3 (Apr 3), roadmap1 (Apr 1)
        assertThat(roadmaps.get(0).getTitle()).isEqualTo("Title 2");
        assertThat(roadmaps.get(1).getTitle()).isEqualTo("Title 3");
        assertThat(roadmaps.get(2).getTitle()).isEqualTo("Title 1");
    }

    @Test
    void findByUserOrderByCreatedAtDesc_ShouldReturnEmptyListForUserWithNoRoadmaps() {
        User newUser = new User();
        newUser.setUsername("newUser");
        newUser.setEmail("new@example.com");
        newUser.setPasswordHash("newHash");
        entityManager.persist(newUser);
        entityManager.flush();

        List<Roadmap> roadmaps = roadmapRepository.findByUserOrderByCreatedAtDesc(newUser);
        assertThat(roadmaps).isEmpty();
    }

    @Test
    void findByUserOrderByCreatedAtDesc_ShouldNotReturnRoadmapsOfOtherUsers() {
        List<Roadmap> roadmaps = roadmapRepository.findByUserOrderByCreatedAtDesc(user1);
        // Ensure none of the returned roadmaps belong to user2
        assertThat(roadmaps).allMatch(r -> r.getUser().getId().equals(user1.getId()));
    }
}