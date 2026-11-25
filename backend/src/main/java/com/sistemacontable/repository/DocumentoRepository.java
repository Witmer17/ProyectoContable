package com.sistemacontable.repository;

import com.sistemacontable.entity.Documento;
import com.sistemacontable.entity.enums.SentidoDocumento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentoRepository extends JpaRepository<Documento, Integer> {
    Optional<Documento> findByTipoAndSerieAndNumeroAndTerceroId(String tipo, String serie, String numero, Integer terceroId);

    List<Documento> findBySentidoAndAnuladoFalseOrderByFechaAscIdAsc(SentidoDocumento sentido);
    List<Documento> findBySentidoAndAnuladoFalseAndFechaBetweenOrderByFechaAscIdAsc(SentidoDocumento sentido, LocalDate desde, LocalDate hasta);
    List<Documento> findBySentidoAndAnuladoFalseAndFechaGreaterThanEqualOrderByFechaAscIdAsc(SentidoDocumento sentido, LocalDate desde);
    List<Documento> findBySentidoAndAnuladoFalseAndFechaLessThanEqualOrderByFechaAscIdAsc(SentidoDocumento sentido, LocalDate hasta);

    List<Documento> findByAsientoIdIsNullAndAnuladoFalseOrderByFechaDesc();

    @Query("SELECT d FROM Documento d WHERE d.sentido = :sentido AND d.saldo > 0 AND d.anulado = false ORDER BY d.fecha ASC")
    List<Documento> findPendientes(@Param("sentido") SentidoDocumento sentido);

    @Query("SELECT COALESCE(SUM(d.saldo), 0) FROM Documento d WHERE d.sentido = :sentido AND d.saldo > 0 AND d.anulado = false")
    BigDecimal sumSaldoPendientes(@Param("sentido") SentidoDocumento sentido);
}
