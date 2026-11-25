package com.sistemacontable.entity;

import com.sistemacontable.entity.enums.TipoMovKardex;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "\"KardexMov\"")
public class KardexMov {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "\"productoId\"", nullable = false)
    private Integer productoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"productoId\"", insertable = false, updatable = false)
    private Producto producto;

    @Column(nullable = false)
    private LocalDate fecha;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(columnDefinition = "\"TipoMovKardex\"", nullable = false)
    private TipoMovKardex tipo;

    @Column(precision = 14, scale = 4, nullable = false)
    private BigDecimal cantidad;

    @Column(name = "\"costoUnit\"", precision = 14, scale = 6, nullable = false)
    private BigDecimal costoUnit;

    @Column(name = "\"costoTotal\"", precision = 14, scale = 2, nullable = false)
    private BigDecimal costoTotal;

    @Column(name = "\"saldoCant\"", precision = 14, scale = 4, nullable = false)
    private BigDecimal saldoCant;

    @Column(name = "\"saldoCosto\"", precision = 14, scale = 2, nullable = false)
    private BigDecimal saldoCosto;

    @Column(name = "\"asientoId\"")
    private Integer asientoId;

    @Column(name = "\"creadoEn\"", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public KardexMov() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getProductoId() { return productoId; }
    public void setProductoId(Integer productoId) { this.productoId = productoId; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public TipoMovKardex getTipo() { return tipo; }
    public void setTipo(TipoMovKardex tipo) { this.tipo = tipo; }

    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }

    public BigDecimal getCostoUnit() { return costoUnit; }
    public void setCostoUnit(BigDecimal costoUnit) { this.costoUnit = costoUnit; }

    public BigDecimal getCostoTotal() { return costoTotal; }
    public void setCostoTotal(BigDecimal costoTotal) { this.costoTotal = costoTotal; }

    public BigDecimal getSaldoCant() { return saldoCant; }
    public void setSaldoCant(BigDecimal saldoCant) { this.saldoCant = saldoCant; }

    public BigDecimal getSaldoCosto() { return saldoCosto; }
    public void setSaldoCosto(BigDecimal saldoCosto) { this.saldoCosto = saldoCosto; }

    public Integer getAsientoId() { return asientoId; }
    public void setAsientoId(Integer asientoId) { this.asientoId = asientoId; }

    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
}
