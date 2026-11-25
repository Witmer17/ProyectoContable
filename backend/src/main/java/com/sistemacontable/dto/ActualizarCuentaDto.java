package com.sistemacontable.dto;

public class ActualizarCuentaDto {
    private String nombre;
    private String naturaleza;
    private String destinoDefecto;
    private Boolean requiereDestino;
    private Boolean activa;

    public ActualizarCuentaDto() {}

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getNaturaleza() { return naturaleza; }
    public void setNaturaleza(String naturaleza) { this.naturaleza = naturaleza; }

    public String getDestinoDefecto() { return destinoDefecto; }
    public void setDestinoDefecto(String destinoDefecto) { this.destinoDefecto = destinoDefecto; }

    public Boolean getRequiereDestino() { return requiereDestino; }
    public void setRequiereDestino(Boolean requiereDestino) { this.requiereDestino = requiereDestino; }

    public Boolean getActiva() { return activa; }
    public void setActiva(Boolean activa) { this.activa = activa; }
}
