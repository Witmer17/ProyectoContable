package com.sistemacontable.repository;

import com.sistemacontable.entity.Periodo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PeriodoRepository extends JpaRepository<Periodo, Integer> {
    Optional<Periodo> findByAnioAndMes(Integer anio, Integer mes);
    List<Periodo> findByAnioOrderByMesAsc(Integer anio);
}
