package com.mymindmirror.backend.payload.request;

import com.mymindmirror.backend.enums.Status;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class TaskRequest {
    private String description;
    private LocalDate dueDate;
    private Status status;
    private String details;       // new
    private List<String> subtasks; // new – will be serialized to JSON
}
