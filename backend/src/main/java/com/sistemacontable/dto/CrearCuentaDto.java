package com.sistemacontable.dto;

public class CrearCuentaDto {
    private String codigo;
    private String nombre;
    private String naturaleza;
    private String destinoDefecto;
    private Boolean requiereDestino;

    public CrearCuentaDto() {}

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getNaturaleza() { return naturaleza; }
    public void setNaturaleza(String naturaleza) { this.naturaleza = naturaleza; }

    public String getDestinoDefecto() { return destinoDefecto; }
    public void setDestinoDefecto(String destinoDefecto) { this.destinoDefecto = destinoDefecto; }

    public Boolean getRequiereDestino() { return requiereDestino; }
    public void setRequiereDestino(Boolean requiereDestino) { this.requiereDestino = requiereDestino; }
}
