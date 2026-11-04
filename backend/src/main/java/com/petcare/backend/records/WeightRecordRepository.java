package com.petcare.backend.records;

import java.util.Optional;

public interface WeightRecordRepository extends PetRecordRepository<WeightRecord> {

    Optional<WeightRecord> findFirstByPetIdAndStatusOrderByOccurredAtDescIdDesc(Long petId, RecordStatus status);
}
