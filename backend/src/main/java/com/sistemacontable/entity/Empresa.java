package com.sistemacontable.entity;

import com.sistemacontable.entity.enums.Actividad;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.math.BigDecimal;

@Entity
@Table(name = "\"Empresa\"")
public class Empresa {

    @Id
    private Integer id = 1;

    @Column(nullable = false)
    private String ruc;

    @Column(name = "\"razonSocial\"", nullable = false)
    private String razonSocial;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(columnDefinition = "\"Actividad\"", nullable = false)
    private Actividad actividad = Actividad.COMERCIAL;

    @Column(name = "\"tienePlanilla\"", nullable = false)
    private Boolean tienePlanilla = false;

    @Column(name = "\"tieneActivos\"", nullable = false)
    private Boolean tieneActivos = false;

    @Column(name = "\"usaDolares\"", nullable = false)
    private Boolean usaDolares = false;

    @Column(name = "\"recibeHonorarios\"", nullable = false)
    private Boolean recibeHonorarios = false;

    @Column(name = "\"igvTasa\"", precision = 5, scale = 4, nullable = false)
    private BigDecimal igvTasa = new BigDecimal("0.18");

    @Column(name = "\"retencionTasa\"", precision = 5, scale = 4, nullable = false)
    private BigDecimal retencionTasa = new BigDecimal("0.08");

    @Column(name = "\"metodoKardex\"", nullable = false)
    private String metodoKardex = "PROMEDIO";

    @Column(nullable = false)
    private Boolean configurada = false;

    @Column(nullable = false)
    private String perfil = "PERSONALIZADO";

    public Empresa() {}

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
