package com.sistemacontable.service;

import com.sistemacontable.dto.CrearDocumentoDto;
import com.sistemacontable.dto.DocumentoDto;
import com.sistemacontable.entity.Documento;
import com.sistemacontable.entity.Tercero;
import com.sistemacontable.entity.enums.Condicion;
import com.sistemacontable.entity.enums.SentidoDocumento;
import com.sistemacontable.entity.enums.TipoTercero;
import com.sistemacontable.repository.AsientoRepository;
import com.sistemacontable.repository.DocumentoRepository;
import com.sistemacontable.repository.TerceroRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DocumentoService {

    private final DocumentoRepository documentoRepository;
    private final TerceroRepository terceroRepository;
    private final AsientoRepository asientoRepository;

    public DocumentoService(
            DocumentoRepository documentoRepository,
            TerceroRepository terceroRepository,
            AsientoRepository asientoRepository) {
        this.documentoRepository = documentoRepository;
        this.terceroRepository = terceroRepository;
        this.asientoRepository = asientoRepository;
    }

    public List<DocumentoDto> listarPendientesAsiento() {
        return documentoRepository.findByAsientoIdIsNullAndAnuladoFalseOrderByFechaDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<DocumentoDto> listar(SentidoDocumento sentido, LocalDate desde, LocalDate hasta) {
        List<Documento> docs;
        if (sentido != null && desde != null && hasta != null) {
            docs = documentoRepository.findBySentidoAndAnuladoFalseAndFechaBetweenOrderByFechaAscIdAsc(sentido, desde, hasta);
        } else if (sentido != null) {
            docs = documentoRepository.findBySentidoAndAnuladoFalseOrderByFechaAscIdAsc(sentido);
        } else {
            docs = documentoRepository.findAll();
        }
        return docs.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public DocumentoDto registrar(CrearDocumentoDto dto) {
        // Asegurar Tercero
        Tercero tercero = null;
        if (dto.getTerceroId() != null) {
            tercero = terceroRepository.findById(dto.getTerceroId()).orElse(null);
        }

        if (tercero == null && dto.getDocumentoTercero() != null && !dto.getDocumentoTercero().isBlank()) {
            String docNum = dto.getDocumentoTercero().trim();
            TipoTercero tipoT = dto.getSentido() == SentidoDocumento.VENTA ? TipoTercero.CLIENTE : TipoTercero.PROVEEDOR;
            Optional<Tercero> opt = terceroRepository.findByTipoAndDocumento(tipoT, docNum);
            if (opt.isPresent()) {
                tercero = opt.get();
            } else {
                Tercero nuevoT = new Tercero();
                nuevoT.setTipo(tipoT);
                nuevoT.setTipoDoc(dto.getTipoDocTercero() != null ? dto.getTipoDocTercero() : (docNum.length() == 11 ? "RUC" : "DNI"));
                nuevoT.setDocumento(docNum);
                nuevoT.setNombre(dto.getNombreTercero() != null && !dto.getNombreTercero().isBlank() ? dto.getNombreTercero().trim() : "TERCERO " + docNum);
                nuevoT.setActivo(true);
                tercero = terceroRepository.save(nuevoT);
            }
        }

        if (tercero == null) {
            throw new IllegalArgumentException("Debe indicar un cliente o proveedor válido");
        }

        String tipoComp = dto.getTipo() != null ? dto.getTipo().trim() : "01";
        String serie = dto.getSerie() != null ? dto.getSerie().trim().toUpperCase() : "F001";
        String numero = dto.getNumero() != null ? dto.getNumero().trim() : "000001";

        // Verificar si ya existe comprobante idéntico
        Optional<Documento> exist = documentoRepository.findByTipoAndSerieAndNumeroAndTerceroId(tipoComp, serie, numero, tercero.getId());
        Documento doc = exist.orElseGet(Documento::new);

        doc.setSentido(dto.getSentido());
        doc.setTipo(tipoComp);
        doc.setSerie(serie);
        doc.setNumero(numero);
        doc.setTerceroId(tercero.getId());
        doc.setTercero(tercero);
        doc.setFecha(dto.getFecha() != null ? dto.getFecha() : LocalDate.now());
        doc.setVencimiento(dto.getVencimiento());

        BigDecimal base = dto.getBase() != null ? dto.getBase() : BigDecimal.ZERO;
        BigDecimal igv = dto.getIgv() != null ? dto.getIgv() : BigDecimal.ZERO;
        BigDecimal total = dto.getTotal() != null ? dto.getTotal() : base.add(igv);

        doc.setBase(base);
        doc.setIgv(igv);
        doc.setTotal(total);

        Condicion cond = dto.getCondicion() != null ? dto.getCondicion() : Condicion.CONTADO_EFECTIVO;
        doc.setCondicion(cond);
        doc.setSaldo(cond == Condicion.CREDITO ? total : BigDecimal.ZERO);
        doc.setOperacion(dto.getSentido() == SentidoDocumento.VENTA ? "VENTA_MERCADERIA" : "COMPRA_MERCADERIA");
        doc.setGlosa(""); // No se genera glosa contable aquí
        doc.setAsientoId(null); // No se genera asiento contable aquí
        doc.setAnulado(false);

        Documento guardado = documentoRepository.save(doc);
        return toDto(guardado);
    }

    private DocumentoDto toDto(Documento d) {
        DocumentoDto dto = new DocumentoDto();
        dto.setId(d.getId());
        dto.setSentido(d.getSentido());
        dto.setTipo(d.getTipo());
        dto.setSerie(d.getSerie());
        dto.setNumero(d.getNumero());
        dto.setTerceroId(d.getTerceroId());
        if (d.getTercero() != null) {
            dto.setTerceroNombre(d.getTercero().getNombre());
            dto.setTerceroDocumento(d.getTercero().getDocumento());
            dto.setTerceroTipoDoc(d.getTercero().getTipoDoc());
        } else if (d.getTerceroId() != null) {
            terceroRepository.findById(d.getTerceroId()).ifPresent(t -> {
                dto.setTerceroNombre(t.getNombre());
                dto.setTerceroDocumento(t.getDocumento());
                dto.setTerceroTipoDoc(t.getTipoDoc());
            });
        }
        dto.setFecha(d.getFecha());
        dto.setVencimiento(d.getVencimiento());
        dto.setBase(d.getBase());
        dto.setIgv(d.getIgv());
        dto.setTotal(d.getTotal());
        dto.setSaldo(d.getSaldo());
        dto.setCondicion(d.getCondicion());
        dto.setAsientoId(d.getAsientoId());
        if (d.getAsientoId() != null) {
            asientoRepository.findById(d.getAsientoId()).ifPresent(a -> dto.setAsientoNumero(a.getNumero()));
        }
        dto.setAnulado(d.getAnulado());
        return dto;
    }
}
