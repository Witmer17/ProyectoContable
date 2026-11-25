package com.sistemacontable.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class ActualizarAsientoDto {
    private LocalDate fecha;
    private String periodo;
    private String glosa;
    private String codigoLibro;
    private String documentoSustentatorio;
    private Integer documentoId;
    private List<LineaInputDto> lineas;

    public ActualizarAsientoDto() {}

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public String getPeriodo() { return periodo; }
    public void setPeriodo(String periodo) { this.periodo = periodo; }

    public String getGlosa() { return glosa; }
    public void setGlosa(String glosa) { this.glosa = glosa; }

    public String getCodigoLibro() { return codigoLibro; }
    public void setCodigoLibro(String codigoLibro) { this.codigoLibro = codigoLibro; }

    public String getDocumentoSustentatorio() { return documentoSustentatorio; }
    public void setDocumentoSustentatorio(String documentoSustentatorio) { this.documentoSustentatorio = documentoSustentatorio; }

    public Integer getDocumentoId() { return documentoId; }
    public void setDocumentoId(Integer documentoId) { this.documentoId = documentoId; }

    public List<LineaInputDto> getLineas() { return lineas; }
    public void setLineas(List<LineaInputDto> lineas) { this.lineas = lineas; }

    public static class LineaInputDto {
        private String cuentaCodigo;
        private BigDecimal debe;
        private BigDecimal haber;
        private Integer terceroId;
        private String documentoSustentatorio;
        private String glosa;

        public LineaInputDto() {}

        public String getCuentaCodigo() { return cuentaCodigo; }
        public void setCuentaCodigo(String cuentaCodigo) { this.cuentaCodigo = cuentaCodigo; }

        public BigDecimal getDebe() { return debe; }
        public void setDebe(BigDecimal debe) { this.debe = debe; }

        public BigDecimal getHaber() { return haber; }
        public void setHaber(BigDecimal haber) { this.haber = haber; }

        public Integer getTerceroId() { return terceroId; }
        public void setTerceroId(Integer terceroId) { this.terceroId = terceroId; }

        public String getDocumentoSustentatorio() { return documentoSustentatorio; }
        public void setDocumentoSustentatorio(String documentoSustentatorio) { this.documentoSustentatorio = documentoSustentatorio; }

        public String getGlosa() { return glosa; }
        public void setGlosa(String glosa) { this.glosa = glosa; }
    }
}
