package com.sistemacontable.repository;

import com.sistemacontable.entity.ActivoFijo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivoFijoRepository extends JpaRepository<ActivoFijo, Integer> {
    List<ActivoFijo> findByEstado(String estado);
}
