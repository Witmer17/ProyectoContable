package com.sistemacontable.dto;

import java.util.List;

public class CuentaDto {
    private String codigo;
    private String nombre;
    private Integer elemento;
    private String naturaleza;
    private Integer nivel;
    private Boolean ultimoNivel;
    private Boolean requiereDestino;
    private String destinoDefecto;
    private String codigoPadre;
    private String denominacion;
    private Boolean esImputable;
    private Boolean activa;
    private List<String> perfiles;
    private String modulo;
    private Integer uso;

    public CuentaDto() {}

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

    public Boolean getRequiereDestino() { return requiereDestino; }
    public void setRequiereDestino(Boolean requiereDestino) { this.requiereDestino = requiereDestino; }

    public String getDestinoDefecto() { return destinoDefecto; }
    public void setDestinoDefecto(String destinoDefecto) { this.destinoDefecto = destinoDefecto; }

    public String getCodigoPadre() { return codigoPadre; }
    public void setCodigoPadre(String codigoPadre) { this.codigoPadre = codigoPadre; }

    public String getDenominacion() { return denominacion != null ? denominacion : nombre; }
    public void setDenominacion(String denominacion) { this.denominacion = denominacion; }

    public Boolean getEsImputable() { return esImputable != null ? esImputable : ultimoNivel; }
    public void setEsImputable(Boolean esImputable) { this.esImputable = esImputable; }

    public Boolean getActiva() { return activa; }
    public void setActiva(Boolean activa) { this.activa = activa; }

    public List<String> getPerfiles() { return perfiles; }
    public void setPerfiles(List<String> perfiles) { this.perfiles = perfiles; }

    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }

    public Integer getUso() { return uso; }
    public void setUso(Integer uso) { this.uso = uso; }
}
