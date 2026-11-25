package com.sistemacontable.entity;

import com.sistemacontable.entity.enums.EstadoAsiento;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "\"Asiento\"")
public class Asiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private Integer numero;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private String periodo; // AAAA-MM

    @Column(nullable = false)
    private String operacion;

    @Column(nullable = false)
    private String glosa;

    @Column(name = "\"codigoLibro\"")
    private String codigoLibro = "05";

    @Column(name = "\"documentoSustentatorio\"")
    private String documentoSustentatorio;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(columnDefinition = "\"EstadoAsiento\"", nullable = false)
    private EstadoAsiento estado = EstadoAsiento.ACTIVO;

    @Column(name = "\"motivoAnulacion\"")
    private String motivoAnulacion;

    @Column(name = "\"reversionId\"")
    private Integer reversionId;

    @Column(name = "\"revierteA\"")
    private Integer revierteA;

    @Column(name = "\"usuarioId\"")
    private Integer usuarioId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"usuarioId\"", insertable = false, updatable = false)
    private Usuario usuario;

    @Column(name = "\"creadoEn\"", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    @OneToMany(mappedBy = "asiento", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC")
    private List<AsientoLinea> lineas = new ArrayList<>();

    public Asiento() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public String getPeriodo() { return periodo; }
    public void setPeriodo(String periodo) { this.periodo = periodo; }

    public String getOperacion() { return operacion; }
    public void setOperacion(String operacion) { this.operacion = operacion; }

    public String getGlosa() { return glosa; }
    public void setGlosa(String glosa) { this.glosa = glosa; }

    public String getCodigoLibro() { return codigoLibro != null ? codigoLibro : "05"; }
    public void setCodigoLibro(String codigoLibro) { this.codigoLibro = codigoLibro; }

    public String getDocumentoSustentatorio() { return documentoSustentatorio; }
    public void setDocumentoSustentatorio(String documentoSustentatorio) { this.documentoSustentatorio = documentoSustentatorio; }

    public EstadoAsiento getEstado() { return estado; }
    public void setEstado(EstadoAsiento estado) { this.estado = estado; }

    public String getMotivoAnulacion() { return motivoAnulacion; }
    public void setMotivoAnulacion(String motivoAnulacion) { this.motivoAnulacion = motivoAnulacion; }

    public Integer getReversionId() { return reversionId; }
    public void setReversionId(Integer reversionId) { this.reversionId = reversionId; }

    public Integer getRevierteA() { return revierteA; }
    public void setRevierteA(Integer revierteA) { this.revierteA = revierteA; }

    public Integer getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Integer usuarioId) { this.usuarioId = usuarioId; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }

    public List<AsientoLinea> getLineas() { return lineas; }
    public void setLineas(List<AsientoLinea> lineas) { this.lineas = lineas; }
}
