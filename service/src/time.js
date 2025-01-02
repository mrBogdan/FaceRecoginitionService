let mockedTime = null;

export const mockTime = (time = null) => {
    mockedTime = time;
};

export const getTime = () => {
    if (mockedTime) {
        return new Date(mockedTime);
    }

    return new Date();
}
