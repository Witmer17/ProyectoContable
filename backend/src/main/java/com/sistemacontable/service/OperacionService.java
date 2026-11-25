package com.sistemacontable.service;

import com.sistemacontable.dto.OperacionRequestDto;
import com.sistemacontable.dto.PrevisualizarResponseDto;
import com.sistemacontable.entity.*;
import com.sistemacontable.entity.enums.*;
import com.sistemacontable.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class OperacionService {

    private final MotorContableService motorContableService;
    private final AsientoRepository asientoRepository;
    private final AsientoLineaRepository asientoLineaRepository;
    private final DocumentoRepository documentoRepository;
    private final TerceroRepository terceroRepository;
    private final AuditoriaRepository auditoriaRepository;

    public OperacionService(
            MotorContableService motorContableService,
            AsientoRepository asientoRepository,
            AsientoLineaRepository asientoLineaRepository,
            DocumentoRepository documentoRepository,
            TerceroRepository terceroRepository,
            AuditoriaRepository auditoriaRepository) {
        this.motorContableService = motorContableService;
        this.asientoRepository = asientoRepository;
        this.asientoLineaRepository = asientoLineaRepository;
        this.documentoRepository = documentoRepository;
        this.terceroRepository = terceroRepository;
        this.auditoriaRepository = auditoriaRepository;
    }

    public PrevisualizarResponseDto previsualizar(OperacionRequestDto request) {
        return motorContableService.previsualizar(request.getOperacion(), request.getDatos());
    }

    @Transactional
    public Map<String, Object> registrar(OperacionRequestDto request, Integer usuarioId) {
        Map<String, Object> datos = request.getDatos();
        String tipoOp = request.getOperacion();

        // Obtener o registrar Tercero
        Tercero tercero = null;
        String docTercero = datos.get("documentoTercero") != null ? datos.get("documentoTercero").toString().trim() : null;
        if (docTercero != null && !docTercero.isBlank()) {
            TipoTercero tipoT = tipoOp.contains("VENTA") || tipoOp.contains("COBRO") ? TipoTercero.CLIENTE : TipoTercero.PROVEEDOR;
            Optional<Tercero> tOpt = terceroRepository.findByTipoAndDocumento(tipoT, docTercero);
            if (tOpt.isPresent()) {
                tercero = tOpt.get();
            } else {
                Tercero nuevoT = new Tercero();
                nuevoT.setTipo(tipoT);
                nuevoT.setTipoDoc(docTercero.length() == 11 ? "RUC" : "DNI");
                nuevoT.setDocumento(docTercero);
                nuevoT.setNombre(datos.get("nombreTercero") != null ? datos.get("nombreTercero").toString().trim() : "CLIENTE/PROVEEDOR " + docTercero);
                nuevoT.setActivo(true);
                tercero = terceroRepository.save(nuevoT);
            }
        }

        // Previsualizar las líneas del asiento
        PrevisualizarResponseDto preview = motorContableService.previsualizar(tipoOp, datos);
        if (!preview.getTotales().getCuadra()) {
            throw new RuntimeException("El asiento contable no cuadra: Debe != Haber");
        }

        // Crear Asiento
        LocalDate fecha = datos.get("fecha") != null ? LocalDate.parse(datos.get("fecha").toString()) : LocalDate.now();
        String periodo = fecha.format(DateTimeFormatter.ofPattern("yyyy-MM"));

        Integer maxNumero = asientoRepository.findMaxNumero();
        int siguienteNumero = (maxNumero != null ? maxNumero : 0) + 1;

        String glosa = datos.get("glosa") != null ? datos.get("glosa").toString() : tipoOp;

        Asiento asiento = new Asiento();
        asiento.setNumero(siguienteNumero);
        asiento.setFecha(fecha);
        asiento.setPeriodo(periodo);
        asiento.setOperacion(tipoOp);
        asiento.setGlosa(glosa);
        asiento.setEstado(EstadoAsiento.ACTIVO);
        asiento.setUsuarioId(usuarioId);
        asiento = asientoRepository.save(asiento);

        // Guardar Líneas
        int orden = 1;
        for (PrevisualizarResponseDto.LineaVistaDto lv : preview.getLineas()) {
            AsientoLinea linea = new AsientoLinea();
            linea.setAsientoId(asiento.getId());
            linea.setOrden(orden++);
            linea.setCuentaCodigo(lv.getCuentaCodigo());
            linea.setDebe(lv.getDebe());
            linea.setHaber(lv.getHaber());
            linea.setEtapa(EtapaLinea.valueOf(lv.getEtapa()));
            if (tercero != null) {
                linea.setTerceroId(tercero.getId());
            }
            linea.setGlosa(lv.getGlosa());
            asientoLineaRepository.save(linea);
        }

        // Guardar Comprobante en Documento si aplica (Compra o Venta)
        if (datos.get("serie") != null && datos.get("numero") != null && tercero != null) {
            String tipoComp = datos.get("tipoComprobante") != null ? datos.get("tipoComprobante").toString() : "01";
            String serie = datos.get("serie").toString().trim().toUpperCase();
            String num = datos.get("numero").toString().trim();
            BigDecimal base = new BigDecimal(datos.get("base").toString());
            BigDecimal igv = datos.get("igv") != null ? new BigDecimal(datos.get("igv").toString()) : BigDecimal.ZERO;
            BigDecimal total = new BigDecimal(datos.get("total").toString());

            String condStr = datos.get("condicion") != null ? datos.get("condicion").toString() : "CREDITO";
            Condicion cond = Condicion.valueOf(condStr);

            Documento doc = new Documento();
            doc.setSentido(tipoOp.contains("VENTA") ? SentidoDocumento.VENTA : SentidoDocumento.COMPRA);
            doc.setTipo(tipoComp);
            doc.setSerie(serie);
            doc.setNumero(num);
            doc.setTerceroId(tercero.getId());
            doc.setFecha(fecha);
            doc.setBase(base);
            doc.setIgv(igv);
            doc.setTotal(total);
            doc.setSaldo(condStr.startsWith("CONTADO") ? BigDecimal.ZERO : total);
            doc.setCondicion(cond);
            doc.setOperacion(tipoOp);
            doc.setGlosa(glosa);
            doc.setAsientoId(asiento.getId());
            doc.setAnulado(false);
            documentoRepository.save(doc);
        }

        // Auditoría
        Auditoria aud = new Auditoria();
        aud.setUsuarioId(usuarioId);
        aud.setAccion("REGISTRAR_OPERACION");
        aud.setEntidad("Asiento");
        aud.setEntidadId(String.valueOf(asiento.getId()));
        aud.setDetalle("Asiento N° " + asiento.getNumero() + " (" + tipoOp + "): " + glosa);
        auditoriaRepository.save(aud);

        Map<String, Object> resp = new HashMap<>();
        resp.put("asientoId", asiento.getId());
        resp.put("numero", asiento.getNumero());
        resp.put("mensaje", "Operación y asiento N° " + asiento.getNumero() + " registrados con éxito");
        return resp;
    }
}
