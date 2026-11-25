package com.sistemacontable.entity;

import com.sistemacontable.entity.enums.EtapaLinea;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.math.BigDecimal;

@Entity
@Table(name = "\"AsientoLinea\"")
public class AsientoLinea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "\"asientoId\"", nullable = false)
    private Integer asientoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"asientoId\"", insertable = false, updatable = false)
    private Asiento asiento;

    @Column(nullable = false)
    private Integer orden;

    @Column(name = "\"cuentaCodigo\"", nullable = false)
    private String cuentaCodigo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "\"cuentaCodigo\"", insertable = false, updatable = false)
    private Cuenta cuenta;

    @Column(precision = 14, scale = 2, nullable = false)
    private BigDecimal debe = BigDecimal.ZERO;

    @Column(precision = 14, scale = 2, nullable = false)
    private BigDecimal haber = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(columnDefinition = "\"EtapaLinea\"", nullable = false)
    private EtapaLinea etapa = EtapaLinea.OTRO;

    @Column(name = "\"terceroId\"")
    private Integer terceroId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "\"terceroId\"", insertable = false, updatable = false)
    private Tercero tercero;

    private String glosa;

    @Column(name = "\"documentoSustentatorio\"")
    private String documentoSustentatorio;

    public AsientoLinea() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getAsientoId() { return asientoId; }
    public void setAsientoId(Integer asientoId) { this.asientoId = asientoId; }

    public Asiento getAsiento() { return asiento; }
    public void setAsiento(Asiento asiento) { this.asiento = asiento; }

    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }

    public String getCuentaCodigo() { return cuentaCodigo; }
    public void setCuentaCodigo(String cuentaCodigo) { this.cuentaCodigo = cuentaCodigo; }

    public Cuenta getCuenta() { return cuenta; }
    public void setCuenta(Cuenta cuenta) { this.cuenta = cuenta; }

    public BigDecimal getDebe() { return debe; }
    public void setDebe(BigDecimal debe) { this.debe = debe; }

    public BigDecimal getHaber() { return haber; }
    public void setHaber(BigDecimal haber) { this.haber = haber; }

    public EtapaLinea getEtapa() { return etapa; }
    public void setEtapa(EtapaLinea etapa) { this.etapa = etapa; }

    public Integer getTerceroId() { return terceroId; }
    public void setTerceroId(Integer terceroId) { this.terceroId = terceroId; }

    public Tercero getTercero() { return tercero; }
    public void setTercero(Tercero tercero) { this.tercero = tercero; }

    public String getGlosa() { return glosa; }
    public void setGlosa(String glosa) { this.glosa = glosa; }

    public String getDocumentoSustentatorio() { return documentoSustentatorio; }
    public void setDocumentoSustentatorio(String documentoSustentatorio) { this.documentoSustentatorio = documentoSustentatorio; }
}
