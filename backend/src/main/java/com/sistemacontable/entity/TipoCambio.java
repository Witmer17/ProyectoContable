package com.sistemacontable.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "\"TipoCambio\"")
public class TipoCambio {

    @Id
    private LocalDate fecha;

    @Column(precision = 8, scale = 4, nullable = false)
    private BigDecimal valor;

    public TipoCambio() {}

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }
}
