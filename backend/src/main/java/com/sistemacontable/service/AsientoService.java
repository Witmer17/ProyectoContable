package com.sistemacontable.service;

import com.sistemacontable.dto.ActualizarAsientoDto;
import com.sistemacontable.dto.AsientoDto;
import com.sistemacontable.entity.Asiento;
import com.sistemacontable.entity.AsientoLinea;
import com.sistemacontable.entity.Auditoria;
import com.sistemacontable.entity.enums.EstadoAsiento;
import com.sistemacontable.entity.enums.EtapaLinea;
import com.sistemacontable.mapper.AsientoMapper;
import com.sistemacontable.repository.AsientoLineaRepository;
import com.sistemacontable.repository.AsientoRepository;
import com.sistemacontable.repository.AuditoriaRepository;
import com.sistemacontable.repository.DocumentoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AsientoService {

    private final AsientoRepository asientoRepository;
    private final AsientoLineaRepository asientoLineaRepository;
    private final AuditoriaRepository auditoriaRepository;
    private final AsientoMapper asientoMapper;
    private final DocumentoRepository documentoRepository;

    public AsientoService(
            AsientoRepository asientoRepository,
            AsientoLineaRepository asientoLineaRepository,
            AuditoriaRepository auditoriaRepository,
            AsientoMapper asientoMapper,
            DocumentoRepository documentoRepository) {
        this.asientoRepository = asientoRepository;
        this.asientoLineaRepository = asientoLineaRepository;
        this.auditoriaRepository = auditoriaRepository;
        this.asientoMapper = asientoMapper;
        this.documentoRepository = documentoRepository;
    }

    public List<AsientoDto> listar(LocalDate desde, LocalDate hasta, String operacion) {
        List<Asiento> lista;
        if (desde != null && hasta != null) {
            lista = asientoRepository.findByFechaBetweenOrderByNumeroAsc(desde, hasta);
        } else if (desde != null) {
            lista = asientoRepository.findByFechaGreaterThanEqualOrderByNumeroAsc(desde);
        } else if (hasta != null) {
            lista = asientoRepository.findByFechaLessThanEqualOrderByNumeroAsc(hasta);
        } else {
            lista = asientoRepository.findAllByOrderByNumeroAsc();
        }

        if (operacion != null && !operacion.isBlank()) {
            lista = lista.stream()
                    .filter(a -> operacion.equalsIgnoreCase(a.getOperacion()))
                    .collect(Collectors.toList());
        }

        return lista.stream().map(asientoMapper::toDto).collect(Collectors.toList());
    }

    public AsientoDto obtener(Integer id) {
        Asiento asiento = asientoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asiento " + id + " no encontrado"));
        return asientoMapper.toDto(asiento);
    }

    @Transactional
    public AsientoDto crear(ActualizarAsientoDto dto, Integer usuarioId) {
        if (dto.getLineas() == null || dto.getLineas().isEmpty()) {
            throw new RuntimeException("El asiento debe tener al menos dos líneas contables");
        }

        BigDecimal sumDebe = BigDecimal.ZERO;
        BigDecimal sumHaber = BigDecimal.ZERO;
        for (ActualizarAsientoDto.LineaInputDto l : dto.getLineas()) {
            sumDebe = sumDebe.add(l.getDebe() != null ? l.getDebe() : BigDecimal.ZERO);
            sumHaber = sumHaber.add(l.getHaber() != null ? l.getHaber() : BigDecimal.ZERO);
        }

        if (sumDebe.compareTo(sumHaber) != 0) {
            throw new RuntimeException("El asiento no cuadra: Total Debe (S/ " + sumDebe + ") != Total Haber (S/ " + sumHaber + ")");
        }

        LocalDate fecha = dto.getFecha() != null ? dto.getFecha() : LocalDate.now();
        String periodo = dto.getPeriodo() != null && !dto.getPeriodo().isBlank()
                ? dto.getPeriodo()
                : fecha.format(DateTimeFormatter.ofPattern("yyyy-MM"));

        Integer maxNumero = asientoRepository.findMaxNumero();
        int siguienteNumero = (maxNumero != null ? maxNumero : 0) + 1;

        Asiento asiento = new Asiento();
        asiento.setNumero(siguienteNumero);
        asiento.setFecha(fecha);
        asiento.setPeriodo(periodo);
        asiento.setOperacion("DIARIO");
        asiento.setGlosa(dto.getGlosa() != null ? dto.getGlosa().trim() : "Registro Libro Diario");
        asiento.setCodigoLibro(dto.getCodigoLibro() != null ? dto.getCodigoLibro() : "05");
        asiento.setDocumentoSustentatorio(dto.getDocumentoSustentatorio());
        asiento.setEstado(EstadoAsiento.ACTIVO);
        asiento.setUsuarioId(usuarioId);
        asiento = asientoRepository.save(asiento);

        int orden = 1;
        for (ActualizarAsientoDto.LineaInputDto l : dto.getLineas()) {
            AsientoLinea nl = new AsientoLinea();
            nl.setAsientoId(asiento.getId());
            nl.setOrden(orden++);
            nl.setCuentaCodigo(l.getCuentaCodigo());
            nl.setDebe(l.getDebe() != null ? l.getDebe() : BigDecimal.ZERO);
            nl.setHaber(l.getHaber() != null ? l.getHaber() : BigDecimal.ZERO);
            nl.setEtapa(EtapaLinea.OTRO);
            nl.setTerceroId(l.getTerceroId());
            nl.setGlosa(l.getGlosa() != null ? l.getGlosa() : asiento.getGlosa());
            nl.setDocumentoSustentatorio(l.getDocumentoSustentatorio() != null ? l.getDocumentoSustentatorio() : asiento.getDocumentoSustentatorio());
            asientoLineaRepository.save(nl);
        }

        Auditoria aud = new Auditoria();
        aud.setUsuarioId(usuarioId);
        aud.setAccion("CREAR_ASIENTO_DIARIO");
        aud.setEntidad("Asiento");
        aud.setEntidadId(String.valueOf(asiento.getId()));
        aud.setDetalle("Creación de Asiento N° " + asiento.getNumero() + " (" + asiento.getGlosa() + ")");
        auditoriaRepository.save(aud);

        if (dto.getDocumentoId() != null) {
            final Integer aId = asiento.getId();
            final String aGlosa = asiento.getGlosa();
            documentoRepository.findById(dto.getDocumentoId()).ifPresent(doc -> {
                doc.setAsientoId(aId);
                doc.setGlosa(aGlosa);
                documentoRepository.save(doc);
            });
        }

        return asientoMapper.toDto(asientoRepository.findById(asiento.getId()).orElse(asiento));
    }

    @Transactional
    public AsientoDto actualizar(Integer id, ActualizarAsientoDto dto, Integer usuarioId) {
        Asiento asiento = asientoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asiento " + id + " no encontrado"));

        if (asiento.getEstado() == EstadoAsiento.ANULADO) {
            throw new RuntimeException("No se puede editar un asiento anulado");
        }

        if (dto.getFecha() != null) {
            asiento.setFecha(dto.getFecha());
            asiento.setPeriodo(dto.getFecha().format(DateTimeFormatter.ofPattern("yyyy-MM")));
        }
        if (dto.getPeriodo() != null && !dto.getPeriodo().isBlank()) {
            asiento.setPeriodo(dto.getPeriodo());
        }
        if (dto.getGlosa() != null) {
            asiento.setGlosa(dto.getGlosa().trim());
        }
        if (dto.getCodigoLibro() != null) {
            asiento.setCodigoLibro(dto.getCodigoLibro().trim());
        }
        if (dto.getDocumentoSustentatorio() != null) {
            asiento.setDocumentoSustentatorio(dto.getDocumentoSustentatorio().trim());
        }

        // Si se enviaron nuevas líneas, validar partida doble y reemplazar
        if (dto.getLineas() != null && !dto.getLineas().isEmpty()) {
            BigDecimal sumDebe = BigDecimal.ZERO;
            BigDecimal sumHaber = BigDecimal.ZERO;
            for (ActualizarAsientoDto.LineaInputDto l : dto.getLineas()) {
                sumDebe = sumDebe.add(l.getDebe() != null ? l.getDebe() : BigDecimal.ZERO);
                sumHaber = sumHaber.add(l.getHaber() != null ? l.getHaber() : BigDecimal.ZERO);
            }

            if (sumDebe.compareTo(sumHaber) != 0) {
                throw new RuntimeException("El asiento no cuadra: Total Debe (" + sumDebe + ") != Total Haber (" + sumHaber + ")");
            }

            // Eliminar líneas actuales
            asientoLineaRepository.deleteByAsientoId(asiento.getId());

            int orden = 1;
            for (ActualizarAsientoDto.LineaInputDto l : dto.getLineas()) {
                AsientoLinea nl = new AsientoLinea();
                nl.setAsientoId(asiento.getId());
                nl.setOrden(orden++);
                nl.setCuentaCodigo(l.getCuentaCodigo());
                nl.setDebe(l.getDebe() != null ? l.getDebe() : BigDecimal.ZERO);
                nl.setHaber(l.getHaber() != null ? l.getHaber() : BigDecimal.ZERO);
                nl.setEtapa(EtapaLinea.OTRO);
                nl.setTerceroId(l.getTerceroId());
                nl.setGlosa(l.getGlosa() != null ? l.getGlosa() : asiento.getGlosa());
                nl.setDocumentoSustentatorio(l.getDocumentoSustentatorio() != null ? l.getDocumentoSustentatorio() : asiento.getDocumentoSustentatorio());
                asientoLineaRepository.save(nl);
            }
        }

        Asiento guardado = asientoRepository.save(asiento);

        // Auditoría
        Auditoria aud = new Auditoria();
        aud.setUsuarioId(usuarioId);
        aud.setAccion("MODIFICAR_ASIENTO");
        aud.setEntidad("Asiento");
        aud.setEntidadId(String.valueOf(asiento.getId()));
        aud.setDetalle("Modificación de Asiento N° " + asiento.getNumero() + " (" + asiento.getGlosa() + ")");
        auditoriaRepository.save(aud);

        return asientoMapper.toDto(guardado);
    }

    @Transactional
    public AsientoDto anular(Integer id, String motivo, Integer usuarioId) {
        Asiento asiento = asientoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asiento " + id + " no encontrado"));

        asiento.setEstado(EstadoAsiento.ANULADO);
        asiento.setMotivoAnulacion(motivo != null ? motivo : "Anulado por el usuario");

        Auditoria aud = new Auditoria();
        aud.setUsuarioId(usuarioId);
        aud.setAccion("ANULAR_ASIENTO");
        aud.setEntidad("Asiento");
        aud.setEntidadId(String.valueOf(asiento.getId()));
        aud.setDetalle("Anulación de Asiento N° " + asiento.getNumero() + ": " + motivo);
        auditoriaRepository.save(aud);

        return asientoMapper.toDto(asientoRepository.save(asiento));
    }
}
