package com.unitrack.config;

import com.unitrack.model.Location;
import com.unitrack.model.QueueStatus;
import com.unitrack.model.Route;
import com.unitrack.model.Stop;
import com.unitrack.repository.LocationRepository;
import com.unitrack.repository.QueueStatusRepository;
import com.unitrack.repository.RouteRepository;
import com.unitrack.repository.StopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final LocationRepository locationRepository;
    private final QueueStatusRepository queueStatusRepository;

    @Override
    public void run(String... args) {
        if (routeRepository.count() == 0) {
            seedRoutesAndStops();
        }
        if (locationRepository.count() == 0) {
            seedLocation();
        }
        if (queueStatusRepository.count() == 0) {
            seedQueueStatus();
        }
    }

    private void seedRoutesAndStops() {
        Route route1 = new Route();
        route1.setName("Main Gate \u2192 Faculty of Science");
        route1.setDescription("Shuttle route from the main entrance to the Faculty of Science complex");
        routeRepository.save(route1);

        stopRepository.saveAll(List.of(
                createStop(route1, "Main Gate", 6.5167, 3.3850, 1),
                createStop(route1, "Sports Centre", 6.5175, 3.3870, 2),
                createStop(route1, "Senate Building", 6.5185, 3.3895, 3),
                createStop(route1, "Main Library", 6.5195, 3.3910, 4),
                createStop(route1, "Faculty of Science", 6.5210, 3.3930, 5)
        ));

        Route route2 = new Route();
        route2.setName("Main Gate \u2192 DLI");
        route2.setDescription("Shuttle route from the main entrance to the Distance Learning Institute");
        routeRepository.save(route2);

        stopRepository.saveAll(List.of(
                createStop(route2, "Main Gate", 6.5167, 3.3850, 1),
                createStop(route2, "Chapel Junction", 6.5180, 3.3865, 2),
                createStop(route2, "Moremi Hall", 6.5200, 3.3880, 3),
                createStop(route2, "DLI Road Junction", 6.5215, 3.3900, 4),
                createStop(route2, "DLI", 6.5230, 3.3920, 5)
        ));
    }

    private Stop createStop(Route route, String name, double lat, double lng, int order) {
        Stop stop = new Stop();
        stop.setRoute(route);
        stop.setName(name);
        stop.setLatitude(lat);
        stop.setLongitude(lng);
        stop.setOrderIndex(order);
        return stop;
    }

    private void seedLocation() {
        Location location = new Location();
        location.setId(1L);
        location.setLatitude(6.5167);
        location.setLongitude(3.3850);
        location.setSpeed(0.0);
        location.setHeading(0.0);
        location.setUpdatedAt(LocalDateTime.now().minusMinutes(10)); // Seed as disconnected
        locationRepository.save(location);
    }

    private void seedQueueStatus() {
        QueueStatus status = new QueueStatus();
        status.setId(1L);
        status.setLevel("LOW");
        status.setUpdatedAt(LocalDateTime.now());
        queueStatusRepository.save(status);
    }
}
