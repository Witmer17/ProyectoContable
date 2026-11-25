package com.sistemacontable.entity;

import com.sistemacontable.entity.enums.Condicion;
import com.sistemacontable.entity.enums.SentidoDocumento;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "\"Documento\"", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tipo", "serie", "numero", "terceroId"})
})
public class Documento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(columnDefinition = "\"SentidoDocumento\"", nullable = false)
    private SentidoDocumento sentido;

    @Column(nullable = false)
    private String tipo; // 01, 03, 07, 08, RH, OT

    @Column(nullable = false)
    private String serie;

    @Column(nullable = false)
    private String numero;

    @Column(name = "\"terceroId\"", nullable = false)
    private Integer terceroId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"terceroId\"", insertable = false, updatable = false)
    private Tercero tercero;

    @Column(nullable = false)
    private LocalDate fecha;

    private LocalDate vencimiento;

    @Column(nullable = false)
    private String moneda = "PEN";

    @Column(name = "\"tipoCambio\"", precision = 8, scale = 4, nullable = false)
    private BigDecimal tipoCambio = BigDecimal.ONE;

    @Column(precision = 14, scale = 2, nullable = false)
    private BigDecimal base;

    @Column(precision = 14, scale = 2, nullable = false)
    private BigDecimal igv;

    @Column(precision = 14, scale = 2, nullable = false)
    private BigDecimal total;

    @Column(precision = 14, scale = 2, nullable = false)
    private BigDecimal saldo;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(columnDefinition = "\"Condicion\"", nullable = false)
    private Condicion condicion;

    @Column(nullable = false)
    private String operacion;

    @Column(nullable = false)
    private String glosa;

    @Column(name = "\"asientoId\"")
    private Integer asientoId;

    @Column(nullable = false)
    private Boolean anulado = false;

    @Column(name = "\"creadoEn\"", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public Documento() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public SentidoDocumento getSentido() { return sentido; }
    public void setSentido(SentidoDocumento sentido) { this.sentido = sentido; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getSerie() { return serie; }
    public void setSerie(String serie) { this.serie = serie; }

    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }

    public Integer getTerceroId() { return terceroId; }
    public void setTerceroId(Integer terceroId) { this.terceroId = terceroId; }

    public Tercero getTercero() { return tercero; }
    public void setTercero(Tercero tercero) { this.tercero = tercero; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public LocalDate getVencimiento() { return vencimiento; }
    public void setVencimiento(LocalDate vencimiento) { this.vencimiento = vencimiento; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public BigDecimal getTipoCambio() { return tipoCambio; }
    public void setTipoCambio(BigDecimal tipoCambio) { this.tipoCambio = tipoCambio; }

    public BigDecimal getBase() { return base; }
    public void setBase(BigDecimal base) { this.base = base; }

    public BigDecimal getIgv() { return igv; }
    public void setIgv(BigDecimal igv) { this.igv = igv; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public BigDecimal getSaldo() { return saldo; }
    public void setSaldo(BigDecimal saldo) { this.saldo = saldo; }

    public Condicion getCondicion() { return condicion; }
    public void setCondicion(Condicion condicion) { this.condicion = condicion; }

    public String getOperacion() { return operacion; }
    public void setOperacion(String operacion) { this.operacion = operacion; }

    public String getGlosa() { return glosa; }
    public void setGlosa(String glosa) { this.glosa = glosa; }

    public Integer getAsientoId() { return asientoId; }
    public void setAsientoId(Integer asientoId) { this.asientoId = asientoId; }

    public Boolean getAnulado() { return anulado; }
    public void setAnulado(Boolean anulado) { this.anulado = anulado; }

    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
}
