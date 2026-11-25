package com.sistemacontable.repository;

import com.sistemacontable.entity.Tercero;
import com.sistemacontable.entity.enums.TipoTercero;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TerceroRepository extends JpaRepository<Tercero, Integer> {
    Optional<Tercero> findByTipoAndDocumento(TipoTercero tipo, String documento);
    List<Tercero> findByTipoOrderByNombreAsc(TipoTercero tipo);
    List<Tercero> findByDocumentoContainingIgnoreCaseOrNombreContainingIgnoreCaseOrderByNombreAsc(String doc, String nombre);
    List<Tercero> findByTipoAndDocumentoContainingIgnoreCaseOrTipoAndNombreContainingIgnoreCaseOrderByNombreAsc(
            TipoTercero tipo1, String doc, TipoTercero tipo2, String nombre);
}
