package com.sistemacontable.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "\"Producto\"")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String codigo;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String unidad = "UND";

    @Column(precision = 14, scale = 4, nullable = false)
    private BigDecimal stock = BigDecimal.ZERO;

    @Column(name = "\"costoPromedio\"", precision = 14, scale = 6, nullable = false)
    private BigDecimal costoPromedio = BigDecimal.ZERO;

    @Column(name = "\"valorTotal\"", precision = 14, scale = 2, nullable = false)
    private BigDecimal valorTotal = BigDecimal.ZERO;

    @Column(nullable = false)
    private String tipo = "MERCADERIA"; // MERCADERIA | MATERIA_PRIMA | PRODUCTO_TERMINADO

    public Producto() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getUnidad() { return unidad; }
    public void setUnidad(String unidad) { this.unidad = unidad; }

    public BigDecimal getStock() { return stock; }
    public void setStock(BigDecimal stock) { this.stock = stock; }

    public BigDecimal getCostoPromedio() { return costoPromedio; }
    public void setCostoPromedio(BigDecimal costoPromedio) { this.costoPromedio = costoPromedio; }

    public BigDecimal getValorTotal() { return valorTotal; }
    public void setValorTotal(BigDecimal valorTotal) { this.valorTotal = valorTotal; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
}
