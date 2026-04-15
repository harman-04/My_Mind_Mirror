package com.mymindmirror.backend.exception;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestExceptionController {

    @GetMapping("/test/illegal")
    public void throwIllegal() {
        throw new IllegalArgumentException("Test illegal argument");
    }

    @GetMapping("/test/runtime")
    public void throwRuntime() {
        throw new RuntimeException("Test runtime exception");
    }

    @GetMapping("/test/generic")
    public void throwGeneric() throws Exception {
        throw new Exception("Test generic exception");
    }
}