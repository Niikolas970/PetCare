package com.petcare.backend.records;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface PetRecordRepository<T extends PetRecord> extends JpaRepository<T, Long> {

    List<T> findByPetIdAndStatusOrderByOccurredAtDesc(Long petId, RecordStatus status);

    List<T> findByPetIdAndStatusAndOccurredAtBetween(Long petId, RecordStatus status,
                                                     LocalDateTime from, LocalDateTime to);

    List<T> findTop10ByPetIdInAndStatusOrderByCreatedAtDesc(Collection<Long> petIds, RecordStatus status);
}
