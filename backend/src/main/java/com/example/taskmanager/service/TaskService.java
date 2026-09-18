package com.example.taskmanager.service;

import com.example.taskmanager.dto.TaskRequest;
import com.example.taskmanager.dto.TaskResponse;
import com.example.taskmanager.model.Task;
import com.example.taskmanager.model.User;
import com.example.taskmanager.repository.TaskRepository;
import com.example.taskmanager.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    public List<TaskResponse> findMine(String email) {
        User user = findUser(email);
        return taskRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public TaskResponse create(String email, TaskRequest request) {
        User user = findUser(email);

        Task task = new Task();
        task.setUser(user);
        task.setTitle(request.title().trim());
        task.setDescription(normalizeDescription(request.description()));
        task.setStatus(request.status());

        return toResponse(taskRepository.save(task));
    }

    public TaskResponse update(String email, Long id, TaskRequest request) {
        User user = findUser(email);

        Task task = taskRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));

        task.setTitle(request.title().trim());
        task.setDescription(normalizeDescription(request.description()));
        task.setStatus(request.status());

        return toResponse(taskRepository.save(task));
    }

    public void delete(String email, Long id) {
        User user = findUser(email);

        Task task = taskRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Tâche introuvable"));

        taskRepository.delete(task);
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
    }

    private String normalizeDescription(String description) {
        return description == null ? "" : description.trim();
    }

    private TaskResponse toResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus(),
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }
}
