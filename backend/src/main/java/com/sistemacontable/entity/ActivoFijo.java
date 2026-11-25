package com.sistemacontable.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "\"ActivoFijo\"")
public class ActivoFijo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String cuenta;

    @Column(name = "\"fechaCompra\"", nullable = false)
    private LocalDate fechaCompra;

    @Column(precision = 14, scale = 2, nullable = false)
    private BigDecimal valor;

    @Column(name = "\"vidaUtilMeses\"", nullable = false)
    private Integer vidaUtilMeses;

    @Column(name = "\"tasaAnual\"", precision = 6, scale = 4, nullable = false)
    private BigDecimal tasaAnual;

    @Column(precision = 14, scale = 2, nullable = false)
    private BigDecimal depreciado = BigDecimal.ZERO;

    @Column(nullable = false)
    private String estado = "ACTIVO";

    @Column(name = "\"documentoId\"")
    private Integer documentoId;

    public ActivoFijo() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getCuenta() { return cuenta; }
    public void setCuenta(String cuenta) { this.cuenta = cuenta; }

    public LocalDate getFechaCompra() { return fechaCompra; }
    public void setFechaCompra(LocalDate fechaCompra) { this.fechaCompra = fechaCompra; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }

    public Integer getVidaUtilMeses() { return vidaUtilMeses; }
    public void setVidaUtilMeses(Integer vidaUtilMeses) { this.vidaUtilMeses = vidaUtilMeses; }

    public BigDecimal getTasaAnual() { return tasaAnual; }
    public void setTasaAnual(BigDecimal tasaAnual) { this.tasaAnual = tasaAnual; }

    public BigDecimal getDepreciado() { return depreciado; }
    public void setDepreciado(BigDecimal depreciado) { this.depreciado = depreciado; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public Integer getDocumentoId() { return documentoId; }
    public void setDocumentoId(Integer documentoId) { this.documentoId = documentoId; }
}
