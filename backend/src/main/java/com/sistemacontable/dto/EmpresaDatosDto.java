package com.sistemacontable.dto;

import com.sistemacontable.entity.enums.Actividad;
import java.math.BigDecimal;

public class EmpresaDatosDto {
    private String ruc;
    private String razonSocial;
    private Actividad actividad;
    private BigDecimal igvTasa;
    private BigDecimal retencionTasa;
    private String metodoKardex;

    public EmpresaDatosDto() {}

    public String getRuc() { return ruc; }
    public void setRuc(String ruc) { this.ruc = ruc; }

    public String getRazonSocial() { return razonSocial; }
    public void setRazonSocial(String razonSocial) { this.razonSocial = razonSocial; }

    public Actividad getActividad() { return actividad; }
    public void setActividad(Actividad actividad) { this.actividad = actividad; }

    public BigDecimal getIgvTasa() { return igvTasa; }
    public void setIgvTasa(BigDecimal igvTasa) { this.igvTasa = igvTasa; }

    public BigDecimal getRetencionTasa() { return retencionTasa; }
    public void setRetencionTasa(BigDecimal retencionTasa) { this.retencionTasa = retencionTasa; }

    public String getMetodoKardex() { return metodoKardex; }
    public void setMetodoKardex(String metodoKardex) { this.metodoKardex = metodoKardex; }
}
