package com.sistemacontable.repository;

import com.sistemacontable.entity.AsientoLinea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AsientoLineaRepository extends JpaRepository<AsientoLinea, Integer> {
    List<AsientoLinea> findByAsientoIdOrderByOrdenAsc(Integer asientoId);
    void deleteByAsientoId(Integer asientoId);
}
