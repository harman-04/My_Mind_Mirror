package com.mymindmirror.backend.payload.request;

import com.mymindmirror.backend.enums.Status;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TaskRequest {
    private String description;
    private LocalDate dueDate;
    private Status status;
}
