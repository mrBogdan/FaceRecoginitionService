create table if not exists users (
    id int primary key,
    name varchar(50),
    password varchar(255) not null,
    email varchar(255) unique not null
)