package com.sistemacontable.repository;

import com.sistemacontable.entity.Cuenta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CuentaRepository extends JpaRepository<Cuenta, String> {
    List<Cuenta> findByElementoOrderByCodigoAsc(Integer elemento);
    List<Cuenta> findByCodigoStartingWithOrderByCodigoAsc(String prefix);
    List<Cuenta> findByElementoAndCodigoContainingIgnoreCaseOrElementoAndNombreContainingIgnoreCaseOrderByCodigoAsc(
            Integer elemento1, String codigo, Integer elemento2, String nombre);
    List<Cuenta> findByCodigoContainingIgnoreCaseOrNombreContainingIgnoreCaseOrderByCodigoAsc(String codigo, String nombre);
}
