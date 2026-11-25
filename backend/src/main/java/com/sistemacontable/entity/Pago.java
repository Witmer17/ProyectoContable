package com.sistemacontable.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "\"Pago\"")
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "\"documentoId\"", nullable = false)
    private Integer documentoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"documentoId\"", insertable = false, updatable = false)
    private Documento documento;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(precision = 14, scale = 2, nullable = false)
    private BigDecimal monto;

    @Column(nullable = false)
    private String medio; // EFECTIVO | BANCO

    @Column(name = "\"cuentaBancaria\"")
    private String cuentaBancaria;

    @Column(name = "\"asientoId\"")
    private Integer asientoId;

    public Pago() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getDocumentoId() { return documentoId; }
    public void setDocumentoId(Integer documentoId) { this.documentoId = documentoId; }

    public Documento getDocumento() { return documento; }
    public void setDocumento(Documento documento) { this.documento = documento; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public String getMedio() { return medio; }
    public void setMedio(String medio) { this.medio = medio; }

    public String getCuentaBancaria() { return cuentaBancaria; }
    public void setCuentaBancaria(String cuentaBancaria) { this.cuentaBancaria = cuentaBancaria; }

    public Integer getAsientoId() { return asientoId; }
    public void setAsientoId(Integer asientoId) { this.asientoId = asientoId; }
}
