package com.sistemacontable.repository;

import com.sistemacontable.entity.Asiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AsientoRepository extends JpaRepository<Asiento, Integer> {
    Optional<Asiento> findByNumero(Integer numero);

    @Query("SELECT COALESCE(MAX(a.numero), 0) FROM Asiento a")
    Integer findMaxNumero();

    List<Asiento> findAllByOrderByNumeroAsc();
    List<Asiento> findByFechaBetweenOrderByNumeroAsc(LocalDate desde, LocalDate hasta);
    List<Asiento> findByFechaGreaterThanEqualOrderByNumeroAsc(LocalDate desde);
    List<Asiento> findByFechaLessThanEqualOrderByNumeroAsc(LocalDate hasta);
}
