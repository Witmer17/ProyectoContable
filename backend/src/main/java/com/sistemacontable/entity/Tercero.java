package com.sistemacontable.entity;

import com.sistemacontable.entity.enums.TipoTercero;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.math.BigDecimal;

@Entity
@Table(name = "\"Tercero\"", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tipo", "documento"})
})
public class Tercero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(columnDefinition = "\"TipoTercero\"", nullable = false)
    private TipoTercero tipo;

    @Column(name = "\"tipoDoc\"", nullable = false)
    private String tipoDoc; // RUC | DNI

    @Column(nullable = false)
    private String documento;

    @Column(nullable = false)
    private String nombre;

    private String direccion;

    @Column(precision = 14, scale = 2)
    private BigDecimal sueldo;

    private String pension; // ONP | AFP

    @Column(nullable = false)
    private Boolean activo = true;

    public Tercero() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public TipoTercero getTipo() { return tipo; }
    public void setTipo(TipoTercero tipo) { this.tipo = tipo; }

    public String getTipoDoc() { return tipoDoc; }
    public void setTipoDoc(String tipoDoc) { this.tipoDoc = tipoDoc; }

    public String getDocumento() { return documento; }
    public void setDocumento(String documento) { this.documento = documento; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }

    public BigDecimal getSueldo() { return sueldo; }
    public void setSueldo(BigDecimal sueldo) { this.sueldo = sueldo; }

    public String getPension() { return pension; }
    public void setPension(String pension) { this.pension = pension; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}
