package com.sistemacontable.dto;

import com.sistemacontable.entity.enums.EstadoAsiento;
import com.sistemacontable.entity.enums.EtapaLinea;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class AsientoDto {
    private Integer id;
    private Integer numero;
    private LocalDate fecha;
    private String periodo;
    private String operacion;
    private String glosa;
    private String codigoLibro;
    private String documentoSustentatorio;
    private EstadoAsiento estado;
    private String motivoAnulacion;
    private Integer reversionId;
    private Integer revierteA;
    private LocalDateTime creadoEn;
    private List<LineaDto> lineas;

    public AsientoDto() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public String getPeriodo() { return periodo; }
    public void setPeriodo(String periodo) { this.periodo = periodo; }

    public String getOperacion() { return operacion; }
    public void setOperacion(String operacion) { this.operacion = operacion; }

    public String getGlosa() { return glosa; }
    public void setGlosa(String glosa) { this.glosa = glosa; }

    public String getCodigoLibro() { return codigoLibro != null ? codigoLibro : "05"; }
    public void setCodigoLibro(String codigoLibro) { this.codigoLibro = codigoLibro; }

    public String getDocumentoSustentatorio() { return documentoSustentatorio; }
    public void setDocumentoSustentatorio(String documentoSustentatorio) { this.documentoSustentatorio = documentoSustentatorio; }

    public EstadoAsiento getEstado() { return estado; }
    public void setEstado(EstadoAsiento estado) { this.estado = estado; }

    public String getMotivoAnulacion() { return motivoAnulacion; }
    public void setMotivoAnulacion(String motivoAnulacion) { this.motivoAnulacion = motivoAnulacion; }

    public Integer getReversionId() { return reversionId; }
    public void setReversionId(Integer reversionId) { this.reversionId = reversionId; }

    public Integer getRevierteA() { return revierteA; }
    public void setRevierteA(Integer revierteA) { this.revierteA = revierteA; }

    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }

    public List<LineaDto> getLineas() { return lineas; }
    public void setLineas(List<LineaDto> lineas) { this.lineas = lineas; }

    public static class LineaDto {
        private Integer id;
        private Integer orden;
        private String codigoLibro;
        private String correlativo;
        private String documentoSustentatorio;
        private String cuentaCodigo;
        private String cuentaNombre;
        private String cuentaPadreCodigo;
        private String cuentaPadreNombre;
        private BigDecimal debe;
        private BigDecimal haber;
        private EtapaLinea etapa;
        private Integer terceroId;
        private String terceroNombre;
        private String glosa;

        public LineaDto() {}

        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }

        public Integer getOrden() { return orden; }
        public void setOrden(Integer orden) { this.orden = orden; }

        public String getCodigoLibro() { return codigoLibro != null ? codigoLibro : "05"; }
        public void setCodigoLibro(String codigoLibro) { this.codigoLibro = codigoLibro; }

        public String getCorrelativo() { return correlativo; }
        public void setCorrelativo(String correlativo) { this.correlativo = correlativo; }

        public String getDocumentoSustentatorio() { return documentoSustentatorio; }
        public void setDocumentoSustentatorio(String documentoSustentatorio) { this.documentoSustentatorio = documentoSustentatorio; }

        public String getCuentaCodigo() { return cuentaCodigo; }
        public void setCuentaCodigo(String cuentaCodigo) { this.cuentaCodigo = cuentaCodigo; }

        public String getCuentaNombre() { return cuentaNombre; }
        public void setCuentaNombre(String cuentaNombre) { this.cuentaNombre = cuentaNombre; }

        public String getDenominacion() { return cuentaNombre; }

        public String getCuentaPadreCodigo() { return cuentaPadreCodigo; }
        public void setCuentaPadreCodigo(String cuentaPadreCodigo) { this.cuentaPadreCodigo = cuentaPadreCodigo; }

        public String getCuentaPadreNombre() { return cuentaPadreNombre; }
        public void setCuentaPadreNombre(String cuentaPadreNombre) { this.cuentaPadreNombre = cuentaPadreNombre; }

        public BigDecimal getDebe() { return debe; }
        public void setDebe(BigDecimal debe) { this.debe = debe; }

        public BigDecimal getHaber() { return haber; }
        public void setHaber(BigDecimal haber) { this.haber = haber; }

        public EtapaLinea getEtapa() { return etapa; }
        public void setEtapa(EtapaLinea etapa) { this.etapa = etapa; }

        public Integer getTerceroId() { return terceroId; }
        public void setTerceroId(Integer terceroId) { this.terceroId = terceroId; }

        public String getTerceroNombre() { return terceroNombre; }
        public void setTerceroNombre(String terceroNombre) { this.terceroNombre = terceroNombre; }

        public String getGlosa() { return glosa; }
        public void setGlosa(String glosa) { this.glosa = glosa; }
    }
}
