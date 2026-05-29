// src/main/java/com/mymindmirror/backend/payload/response/UserPreferencesResponse.java
package com.mymindmirror.backend.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferencesResponse {
    private String availableHoursJson;
    private String timezone;
}