package com.sistemacontable.dto;

import java.math.BigDecimal;
import java.util.List;

public class PrevisualizarResponseDto {
    private List<LineaVistaDto> lineas;
    private TotalesDto totales;

    public PrevisualizarResponseDto() {}

    public PrevisualizarResponseDto(List<LineaVistaDto> lineas, TotalesDto totales) {
        this.lineas = lineas;
        this.totales = totales;
    }

    public List<LineaVistaDto> getLineas() { return lineas; }
    public void setLineas(List<LineaVistaDto> lineas) { this.lineas = lineas; }

    public TotalesDto getTotales() { return totales; }
    public void setTotales(TotalesDto totales) { this.totales = totales; }

    public static class LineaVistaDto {
        private String cuentaCodigo;
        private String cuentaNombre;
        private BigDecimal debe;
        private BigDecimal haber;
        private String etapa;
        private String terceroNombre;
        private String glosa;

        public LineaVistaDto() {}

        public LineaVistaDto(String cuentaCodigo, String cuentaNombre, BigDecimal debe, BigDecimal haber, String etapa, String terceroNombre, String glosa) {
            this.cuentaCodigo = cuentaCodigo;
            this.cuentaNombre = cuentaNombre;
            this.debe = debe;
            this.haber = haber;
            this.etapa = etapa;
            this.terceroNombre = terceroNombre;
            this.glosa = glosa;
        }

        public String getCuentaCodigo() { return cuentaCodigo; }
        public void setCuentaCodigo(String cuentaCodigo) { this.cuentaCodigo = cuentaCodigo; }

        public String getCuentaNombre() { return cuentaNombre; }
        public void setCuentaNombre(String cuentaNombre) { this.cuentaNombre = cuentaNombre; }

        public BigDecimal getDebe() { return debe; }
        public void setDebe(BigDecimal debe) { this.debe = debe; }

        public BigDecimal getHaber() { return haber; }
        public void setHaber(BigDecimal haber) { this.haber = haber; }

        public String getEtapa() { return etapa; }
        public void setEtapa(String etapa) { this.etapa = etapa; }

        public String getTerceroNombre() { return terceroNombre; }
        public void setTerceroNombre(String terceroNombre) { this.terceroNombre = terceroNombre; }

        public String getGlosa() { return glosa; }
        public void setGlosa(String glosa) { this.glosa = glosa; }
    }

    public static class TotalesDto {
        private BigDecimal debe;
        private BigDecimal haber;
        private Boolean cuadra;

        public TotalesDto() {}

        public TotalesDto(BigDecimal debe, BigDecimal haber, Boolean cuadra) {
            this.debe = debe;
            this.haber = haber;
            this.cuadra = cuadra;
        }

        public BigDecimal getDebe() { return debe; }
        public void setDebe(BigDecimal debe) { this.debe = debe; }

        public BigDecimal getHaber() { return haber; }
        public void setHaber(BigDecimal haber) { this.haber = haber; }

        public Boolean getCuadra() { return cuadra; }
        public void setCuadra(Boolean cuadra) { this.cuadra = cuadra; }
    }
}
