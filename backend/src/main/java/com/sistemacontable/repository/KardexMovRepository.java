package com.sistemacontable.repository;

import com.sistemacontable.entity.KardexMov;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KardexMovRepository extends JpaRepository<KardexMov, Integer> {
    List<KardexMov> findByProductoIdOrderByFechaAscIdAsc(Integer productoId);
}
