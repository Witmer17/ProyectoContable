package com.sistemacontable.dto;

import com.sistemacontable.entity.enums.Rol;

public class AuthResponse {
    private String token;
    private UsuarioDto usuario;

    public AuthResponse() {}

    public AuthResponse(String token, UsuarioDto usuario) {
        this.token = token;
        this.usuario = usuario;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public UsuarioDto getUsuario() { return usuario; }
    public void setUsuario(UsuarioDto usuario) { this.usuario = usuario; }

    public static class UsuarioDto {
        private Integer id;
        private String email;
        private String nombre;
        private Rol rol;

        public UsuarioDto() {}

        public UsuarioDto(Integer id, String email, String nombre, Rol rol) {
            this.id = id;
            this.email = email;
            this.nombre = nombre;
            this.rol = rol;
        }

        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getNombre() { return nombre; }
        public void setNombre(String nombre) { this.nombre = nombre; }

        public Rol getRol() { return rol; }
        public void setRol(Rol rol) { this.rol = rol; }
    }
}
