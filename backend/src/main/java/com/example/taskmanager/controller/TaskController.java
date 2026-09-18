package com.example.taskmanager.controller;

import com.example.taskmanager.dto.TaskRequest;
import com.example.taskmanager.dto.TaskResponse;
import com.example.taskmanager.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public List<TaskResponse> findMine(Authentication authentication) {
        return taskService.findMine(authentication.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(
            Authentication authentication,
            @Valid @RequestBody TaskRequest request
    ) {
        return taskService.create(authentication.getName(), request);
    }

    @PutMapping("/{id}")
    public TaskResponse update(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody TaskRequest request
    ) {
        return taskService.update(authentication.getName(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        taskService.delete(authentication.getName(), id);
    }
}
