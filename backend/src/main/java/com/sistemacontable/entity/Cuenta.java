package com.sistemacontable.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "\"Cuenta\"")
public class Cuenta {

    @Id
    private String codigo;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private Integer elemento;

    @Column(nullable = false)
    private String naturaleza; // DEUDORA | ACREEDORA

    @Column(nullable = false)
    private Integer nivel;

    @Column(name = "\"ultimoNivel\"", nullable = false)
    private Boolean ultimoNivel = true;

    @Column(name = "\"codigoPadre\"")
    private String codigoPadre;

    @Column(name = "\"requiereDestino\"", nullable = false)
    private Boolean requiereDestino = false;

    @Column(name = "\"destinoDefecto\"")
    private String destinoDefecto;

    @Column(nullable = false)
    private Boolean activa = true;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "\"perfiles\"", columnDefinition = "text[]")
    private List<String> perfiles = new ArrayList<>();

    private String modulo;

    @Column(nullable = false)
    private Integer uso = 0;

    public Cuenta() {}

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public Integer getElemento() { return elemento; }
    public void setElemento(Integer elemento) { this.elemento = elemento; }

    public String getNaturaleza() { return naturaleza; }
    public void setNaturaleza(String naturaleza) { this.naturaleza = naturaleza; }

    public Integer getNivel() { return nivel; }
    public void setNivel(Integer nivel) { this.nivel = nivel; }

    public Boolean getUltimoNivel() { return ultimoNivel; }
    public void setUltimoNivel(Boolean ultimoNivel) { this.ultimoNivel = ultimoNivel; }

    public String getCodigoPadre() { return codigoPadre; }
    public void setCodigoPadre(String codigoPadre) { this.codigoPadre = codigoPadre; }

    public String getDenominacion() { return nombre; }
    public void setDenominacion(String denominacion) { this.nombre = denominacion; }

    public Boolean getEsImputable() { return ultimoNivel; }
    public void setEsImputable(Boolean esImputable) { this.ultimoNivel = esImputable; }

    public Boolean getRequiereDestino() { return requiereDestino; }
    public void setRequiereDestino(Boolean requiereDestino) { this.requiereDestino = requiereDestino; }

    public String getDestinoDefecto() { return destinoDefecto; }
    public void setDestinoDefecto(String destinoDefecto) { this.destinoDefecto = destinoDefecto; }

    public Boolean getActiva() { return activa; }
    public void setActiva(Boolean activa) { this.activa = activa; }

    public List<String> getPerfiles() { return perfiles; }
    public void setPerfiles(List<String> perfiles) { this.perfiles = perfiles; }

    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }

    public Integer getUso() { return uso; }
    public void setUso(Integer uso) { this.uso = uso; }
}
