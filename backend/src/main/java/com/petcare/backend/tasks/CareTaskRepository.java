package com.petcare.backend.tasks;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CareTaskRepository extends JpaRepository<CareTask, Long> {

    Optional<CareTask> findByIdAndPetId(Long id, Long petId);

    List<CareTask> findByPetIdOrderByDueAtAsc(Long petId);

    List<CareTask> findByPetIdAndStatusOrderByDueAtAsc(Long petId, CareTaskStatus status);

    List<CareTask> findByPetIdAndDueAtBetween(Long petId, LocalDateTime from, LocalDateTime to);

    List<CareTask> findByPetIdInOrderByDueAtAsc(Collection<Long> petIds);

    List<CareTask> findByPetIdInAndStatusAndDueAtBetweenOrderByDueAtAsc(
            Collection<Long> petIds, CareTaskStatus status, LocalDateTime from, LocalDateTime to);

    List<CareTask> findByPetIdInAndStatusAndDueAtBeforeOrderByDueAtAsc(
            Collection<Long> petIds, CareTaskStatus status, LocalDateTime before);

    long countByPetIdInAndStatusAndDueAtBetween(
            Collection<Long> petIds, CareTaskStatus status, LocalDateTime from, LocalDateTime to);

    long countByPetIdInAndStatusAndDueAtBefore(Collection<Long> petIds, CareTaskStatus status, LocalDateTime before);

    Optional<CareTask> findFirstByPetIdAndStatusOrderByDueAtAsc(Long petId, CareTaskStatus status);

    List<CareTask> findTop10ByPetIdInOrderByCreatedAtDesc(Collection<Long> petIds);

    List<CareTask> findBySourceDoseIdAndStatus(Long sourceDoseId, CareTaskStatus status);
}
