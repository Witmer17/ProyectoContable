package com.sistemacontable.repository;

import com.sistemacontable.entity.TipoCambio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface TipoCambioRepository extends JpaRepository<TipoCambio, LocalDate> {
}
