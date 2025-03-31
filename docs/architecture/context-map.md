# Bounded Context Map

## Visual Context Map

```
+--------------------+     publishes events     +----------------------+
|                    |----------------------->   |                      |
|    User Context    |                          |  Personality Context  |
|                    |     consumes events      |                      |
+--------------------+   <-----------------------+----------------------+
         |                                                 |
         | customer/                                       |
         | supplier                                        |
         |                                                 |
         v                                                 v
+--------------------+     shared kernel        +----------------------+
|                    |<------------------------>|                      |
|  Challenge Context |                          |   FocusArea Context  |
|                    |     partnership          |                      |
+--------------------+                          +----------------------+
         |                                                 ^
         | partnership                                     |
         |                                                 |
         v                                                 |
+--------------------+     publishes events     +----------------------+
|                    |----------------------->   |                      |
| Evaluation Context |                          |   Progress Context   |
|                    |                          |                      |
+--------------------+                          +----------------------+
```

## Relationship Types Explained

### Partnership
In a partnership relationship, two bounded contexts collaborate with mutual understanding. Each context may still have its own model, but they work together closely and changes in one context may affect the other. Their models should evolve together.

**Examples:**
- **Challenge <-> Evaluation**: These contexts work closely together as challenges must be evaluated, and evaluations only make sense in the context of challenges.
- **User <-> Challenge**: User identity is needed for challenges, and challenges are created specifically for users.

### Customer-Supplier
In this relationship, the supplier context provides services to the customer context. The upstream (supplier) context has no dependencies on the downstream (customer) context. However, the supplier context should accommodate the needs of the customer context.

**Examples:**
- **User <-> Personality**: User context supplies identity information, and Personality context consumes it to create profiles.
- **User <-> Progress**: User context is upstream, while Progress context tracks the journey of users.

### Shared Kernel
A shared kernel is a subset of the domain model that multiple bounded contexts share. It represents concepts that are identical across contexts. Changes to the shared kernel affect all contexts that use it.

**Example:**
- **Focus Area <-> Challenge**: Both contexts share the concept of Focus Areas and use the same FocusArea value object.

### Anti-Corruption Layer (ACL)
An Anti-Corruption Layer is an isolation layer that translates between different contexts to prevent one context's model from corrupting another. It's typically used when integrating with legacy systems or external services.

**Example:**
- Used in repositories that cross aggregate boundaries, such as `ChallengeRepository.findByUserEmail()`.

## Integration Methods

### 1. Domain Events
The primary integration method between contexts. Events allow contexts to communicate without direct dependencies.

**Flow:**
1. Context A publishes an event (e.g., USER_CREATED)
2. Context B subscribes to the event
3. Context B reacts to the event (e.g., creating a personality profile)

### 2. Shared Kernel
Used sparingly for concepts that are truly common between contexts.

**Example:**
- FocusArea value object is shared between Challenge and FocusArea contexts

### 3. Repository Lookups
When one context needs data from another context, it uses repositories to fetch the data by ID.

**Example:**
- ChallengeService using UserRepository to look up a user by ID or email 