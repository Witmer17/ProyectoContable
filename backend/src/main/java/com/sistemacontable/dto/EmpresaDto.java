package com.sistemacontable.dto;

import com.sistemacontable.entity.enums.Actividad;
import java.math.BigDecimal;

public class EmpresaDto {
    private Integer id;
    private String ruc;
    private String razonSocial;
    private Actividad actividad;
    private Boolean tienePlanilla;
    private Boolean tieneActivos;
    private Boolean usaDolares;
    private Boolean recibeHonorarios;
    private BigDecimal igvTasa;
    private BigDecimal retencionTasa;
    private String metodoKardex;
    private Boolean configurada;
    private String perfil;

    public EmpresaDto() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getRuc() { return ruc; }
    public void setRuc(String ruc) { this.ruc = ruc; }

    public String getRazonSocial() { return razonSocial; }
    public void setRazonSocial(String razonSocial) { this.razonSocial = razonSocial; }

    public Actividad getActividad() { return actividad; }
    public void setActividad(Actividad actividad) { this.actividad = actividad; }

    public Boolean getTienePlanilla() { return tienePlanilla; }
    public void setTienePlanilla(Boolean tienePlanilla) { this.tienePlanilla = tienePlanilla; }

    public Boolean getTieneActivos() { return tieneActivos; }
    public void setTieneActivos(Boolean tieneActivos) { this.tieneActivos = tieneActivos; }

    public Boolean getUsaDolares() { return usaDolares; }
    public void setUsaDolares(Boolean usaDolares) { this.usaDolares = usaDolares; }

    public Boolean getRecibeHonorarios() { return recibeHonorarios; }
    public void setRecibeHonorarios(Boolean recibeHonorarios) { this.recibeHonorarios = recibeHonorarios; }

    public BigDecimal getIgvTasa() { return igvTasa; }
    public void setIgvTasa(BigDecimal igvTasa) { this.igvTasa = igvTasa; }

    public BigDecimal getRetencionTasa() { return retencionTasa; }
    public void setRetencionTasa(BigDecimal retencionTasa) { this.retencionTasa = retencionTasa; }

    public String getMetodoKardex() { return metodoKardex; }
    public void setMetodoKardex(String metodoKardex) { this.metodoKardex = metodoKardex; }

    public Boolean getConfigurada() { return configurada; }
    public void setConfigurada(Boolean configurada) { this.configurada = configurada; }

    public String getPerfil() { return perfil; }
    public void setPerfil(String perfil) { this.perfil = perfil; }
}
