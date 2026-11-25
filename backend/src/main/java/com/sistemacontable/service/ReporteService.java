package com.sistemacontable.service;

import com.sistemacontable.entity.Asiento;
import com.sistemacontable.entity.Documento;
import com.sistemacontable.entity.Empresa;
import com.sistemacontable.entity.enums.SentidoDocumento;
import com.sistemacontable.repository.AsientoRepository;
import com.sistemacontable.repository.DocumentoRepository;
import com.sistemacontable.repository.EmpresaRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class ReporteService {

    private final DocumentoRepository documentoRepository;
    private final EmpresaRepository empresaRepository;
    private final AsientoRepository asientoRepository;

    public ReporteService(DocumentoRepository documentoRepository, EmpresaRepository empresaRepository, AsientoRepository asientoRepository) {
        this.documentoRepository = documentoRepository;
        this.empresaRepository = empresaRepository;
        this.asientoRepository = asientoRepository;
    }

    private List<Documento> getDocumentos(SentidoDocumento sentido, LocalDate desde, LocalDate hasta) {
        if (desde != null && hasta != null) {
            return documentoRepository.findBySentidoAndAnuladoFalseAndFechaBetweenOrderByFechaAscIdAsc(sentido, desde, hasta);
        } else if (desde != null) {
            return documentoRepository.findBySentidoAndAnuladoFalseAndFechaGreaterThanEqualOrderByFechaAscIdAsc(sentido, desde);
        } else if (hasta != null) {
            return documentoRepository.findBySentidoAndAnuladoFalseAndFechaLessThanEqualOrderByFechaAscIdAsc(sentido, hasta);
        } else {
            return documentoRepository.findBySentidoAndAnuladoFalseOrderByFechaAscIdAsc(sentido);
        }
    }

    public Map<String, Object> registroCompras(LocalDate desde, LocalDate hasta) {
        List<Documento> docs = getDocumentos(SentidoDocumento.COMPRA, desde, hasta);
        Empresa emp = empresaRepository.findById(1).orElseGet(Empresa::new);

        List<Map<String, Object>> filas = new ArrayList<>();
        BigDecimal sumBase = BigDecimal.ZERO;
        BigDecimal sumIgv = BigDecimal.ZERO;
        BigDecimal sumNoGravada = BigDecimal.ZERO;
        BigDecimal sumTotal = BigDecimal.ZERO;

        int corr = 1;
        for (Documento d : docs) {
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("correlativo", String.format("%02d", corr++));
            fila.put("fechaEmision", d.getFecha().toString());
            fila.put("fechaVencimiento", d.getVencimiento() != null ? d.getVencimiento().toString() : "");
            fila.put("tipoComprobante", d.getTipo());
            fila.put("serie", d.getSerie());
            fila.put("numero", d.getNumero());
            fila.put("proveedorTipoDoc", d.getTercero() != null ? ("RUC".equals(d.getTercero().getTipoDoc()) ? "6" : "1") : "6");
            fila.put("proveedorNumeroDoc", d.getTercero() != null ? d.getTercero().getDocumento() : "");
            fila.put("proveedorRazonSocial", d.getTercero() != null ? d.getTercero().getNombre() : "");
            fila.put("baseImponible", d.getBase());
            fila.put("igv", d.getIgv());
            fila.put("noGravada", BigDecimal.ZERO);
            fila.put("total", d.getTotal());
            fila.put("glosa", d.getGlosa());
            fila.put("asientoId", d.getAsientoId());
            fila.put("asientoNumero", d.getAsientoId() != null ? asientoRepository.findById(d.getAsientoId()).map(Asiento::getNumero).orElse(null) : null);

            sumBase = sumBase.add(d.getBase());
            sumIgv = sumIgv.add(d.getIgv());
            sumTotal = sumTotal.add(d.getTotal());

            filas.add(fila);
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("periodo", (desde != null ? desde.toString() : "2026-09") + " a " + (hasta != null ? hasta.toString() : "2026-10"));
        resp.put("rucEmpresa", emp.getRuc() != null ? emp.getRuc() : "20000000001");
        resp.put("razonSocialEmpresa", emp.getRazonSocial() != null ? emp.getRazonSocial() : "EMPRESA GENERAL S.A.C.");
        resp.put("filas", filas);

        Map<String, Object> totales = new LinkedHashMap<>();
        totales.put("baseImponible", sumBase);
        totales.put("igv", sumIgv);
        totales.put("noGravada", sumNoGravada);
        totales.put("total", sumTotal);
        resp.put("totales", totales);

        return resp;
    }

    public Map<String, Object> registroVentas(LocalDate desde, LocalDate hasta) {
        List<Documento> docs = getDocumentos(SentidoDocumento.VENTA, desde, hasta);
        Empresa emp = empresaRepository.findById(1).orElseGet(Empresa::new);

        List<Map<String, Object>> filas = new ArrayList<>();
        BigDecimal sumBase = BigDecimal.ZERO;
        BigDecimal sumIgv = BigDecimal.ZERO;
        BigDecimal sumTotal = BigDecimal.ZERO;

        int corr = 1;
        for (Documento d : docs) {
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("correlativo", String.format("%02d", corr++));
            fila.put("fechaEmision", d.getFecha().toString());
            fila.put("fechaVencimiento", d.getVencimiento() != null ? d.getVencimiento().toString() : "");
            fila.put("tipoComprobante", d.getTipo());
            fila.put("serie", d.getSerie());
            fila.put("numero", d.getNumero());
            fila.put("clienteTipoDoc", d.getTercero() != null ? ("RUC".equals(d.getTercero().getTipoDoc()) ? "6" : "1") : "6");
            fila.put("clienteNumeroDoc", d.getTercero() != null ? d.getTercero().getDocumento() : "");
            fila.put("clienteRazonSocial", d.getTercero() != null ? d.getTercero().getNombre() : "");
            fila.put("baseImponible", d.getBase());
            fila.put("igv", d.getIgv());
            fila.put("total", d.getTotal());
            fila.put("glosa", d.getGlosa());
            fila.put("asientoId", d.getAsientoId());
            fila.put("asientoNumero", d.getAsientoId() != null ? asientoRepository.findById(d.getAsientoId()).map(Asiento::getNumero).orElse(null) : null);

            sumBase = sumBase.add(d.getBase());
            sumIgv = sumIgv.add(d.getIgv());
            sumTotal = sumTotal.add(d.getTotal());

            filas.add(fila);
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("periodo", (desde != null ? desde.toString() : "2026-10") + " a " + (hasta != null ? hasta.toString() : "2026-10"));
        resp.put("rucEmpresa", emp.getRuc() != null ? emp.getRuc() : "20000000001");
        resp.put("razonSocialEmpresa", emp.getRazonSocial() != null ? emp.getRazonSocial() : "EMPRESA GENERAL S.A.C.");
        resp.put("filas", filas);

        Map<String, Object> totales = new LinkedHashMap<>();
        totales.put("baseImponible", sumBase);
        totales.put("igv", sumIgv);
        totales.put("total", sumTotal);
        resp.put("totales", totales);

        return resp;
    }

    public Map<String, Object> pendientes(String tipo) {
        SentidoDocumento sentido = "por-cobrar".equalsIgnoreCase(tipo) ? SentidoDocumento.VENTA : SentidoDocumento.COMPRA;
        List<Documento> docs = documentoRepository.findPendientes(sentido);

        List<Map<String, Object>> filas = new ArrayList<>();
        BigDecimal sumSaldo = BigDecimal.ZERO;
        for (Documento d : docs) {
            Map<String, Object> f = new HashMap<>();
            f.put("documentoId", d.getId());
            f.put("comprobante", d.getTipo() + " " + d.getSerie() + "-" + d.getNumero());
            f.put("tercero", d.getTercero() != null ? d.getTercero().getNombre() : "");
            f.put("fecha", d.getFecha().toString());
            f.put("total", d.getTotal());
            f.put("saldo", d.getSaldo());
            sumSaldo = sumSaldo.add(d.getSaldo());
            filas.add(f);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("filas", filas);
        resp.put("totales", Map.of("saldo", sumSaldo));
        return resp;
    }

    public Map<String, Object> balanceComprobacion() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("filas", Collections.emptyList());
        resp.put("resumen", Map.of("cuadra", true));
        return resp;
    }

    public Map<String, Object> estadoResultados() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("resumen", Map.of("utilidad", BigDecimal.ZERO));
        return resp;
    }
}
