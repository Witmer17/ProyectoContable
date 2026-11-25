package com.sistemacontable.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "\"Periodo\"", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"anio", "mes"})
})
public class Periodo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer anio;

    @Column(nullable = false)
    private Integer mes;

    @Column(nullable = false)
    private Boolean cerrado = false;

    private String motivo;

    @Column(name = "\"cerradoEn\"")
    private LocalDateTime cerradoEn;

    public Periodo() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getAnio() { return anio; }
    public void setAnio(Integer anio) { this.anio = anio; }

    public Integer getMes() { return mes; }
    public void setMes(Integer mes) { this.mes = mes; }

    public Boolean getCerrado() { return cerrado; }
    public void setCerrado(Boolean cerrado) { this.cerrado = cerrado; }

    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }

    public LocalDateTime getCerradoEn() { return cerradoEn; }
    public void setCerradoEn(LocalDateTime cerradoEn) { this.cerradoEn = cerradoEn; }
}
