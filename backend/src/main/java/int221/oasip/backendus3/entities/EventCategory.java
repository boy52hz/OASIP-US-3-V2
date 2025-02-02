package int221.oasip.backendus3.entities;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.util.List;

@Entity
@Table(name = "eventCategory")
@Setter
@Getter
@NoArgsConstructor
public class EventCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "eventCategoryId", nullable = false)
    private Integer id;

    @Column(name = "eventCategoryName", nullable = false, length = 100, unique = true)
    private String eventCategoryName;

    @Column(name = "eventCategoryDescription", length = 500)
    private String eventCategoryDescription;

    @Column(name = "eventDuration", nullable = false)
    private Integer eventDuration;

    public EventCategory(String eventCategoryName, String eventCategoryDescription, Integer eventDuration) {
        this.eventCategoryName = eventCategoryName;
        this.eventCategoryDescription = eventCategoryDescription;
        this.eventDuration = eventDuration;
    }

    @OneToMany(mappedBy = "eventCategory", fetch = FetchType.LAZY)
    private List<EventCategoryOwner> owners;
}
